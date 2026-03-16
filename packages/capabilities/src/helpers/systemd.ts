import type { ProvisionContext, ProvisionResult } from "@clawctl/types";

/**
 * Find the default non-root user by reading /etc/passwd.
 * Falls back to SUDO_USER env var.
 */
export async function findDefaultUser(ctx: ProvisionContext): Promise<string> {
  const sudoUser = process.env.SUDO_USER;
  if (sudoUser) return sudoUser;

  const passwd = await ctx.fs.readFile("/etc/passwd", "utf-8");
  for (const line of passwd.split("\n")) {
    const fields = line.split(":");
    if (fields.length < 7) continue;
    const uid = parseInt(fields[2], 10);
    if (uid >= 1000 && uid < 65534) {
      return fields[0];
    }
  }

  throw new Error("Could not determine default user from /etc/passwd");
}

/** Check if a systemd user service is enabled. */
export async function isEnabled(ctx: ProvisionContext, service: string): Promise<boolean> {
  const result = await ctx.exec("systemctl", ["--user", "is-enabled", service], { quiet: true });
  return result.exitCode === 0;
}

/** Check if a systemd user service is active. */
export async function isActive(ctx: ProvisionContext, service: string): Promise<boolean> {
  const result = await ctx.exec("systemctl", ["--user", "is-active", service], { quiet: true });
  return result.exitCode === 0 && result.stdout.trim() === "active";
}

/** Reload the systemd user daemon. */
export async function daemonReload(ctx: ProvisionContext): Promise<void> {
  await ctx.exec("systemctl", ["--user", "daemon-reload"], { quiet: true });
}

/** Enable a systemd user service. Throws on failure. */
export async function enable(ctx: ProvisionContext, service: string): Promise<void> {
  const result = await ctx.exec("systemctl", ["--user", "enable", service], { quiet: true });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to enable ${service}: ${result.stderr}`);
  }
}

/** Provision systemd linger for the default user. */
export async function provisionLinger(ctx: ProvisionContext): Promise<ProvisionResult> {
  try {
    const user = await findDefaultUser(ctx);
    const result = await ctx.exec("loginctl", ["enable-linger", user], { quiet: true });
    if (result.exitCode !== 0) {
      throw new Error(`loginctl enable-linger failed: ${result.stderr}`);
    }

    // Verify the linger file was created
    try {
      await ctx.fs.readFile(`/var/lib/systemd/linger/${user}`);
    } catch {
      throw new Error(`linger file not created for ${user}`);
    }

    ctx.log(`systemd linger enabled for ${user}`);
    return { name: "systemd-linger", status: "installed", detail: user };
  } catch (err) {
    return { name: "systemd-linger", status: "failed", error: String(err) };
  }
}
