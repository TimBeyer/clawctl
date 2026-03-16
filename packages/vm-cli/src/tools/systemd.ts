import { exec } from "../exec.js";
import { readFile } from "fs/promises";

/**
 * Find the default non-root user by reading /etc/passwd.
 * Falls back to SUDO_USER env var.
 */
export async function findDefaultUser(): Promise<string> {
  const sudoUser = process.env.SUDO_USER;
  if (sudoUser) return sudoUser;

  const passwd = await readFile("/etc/passwd", "utf-8");
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

/** Enable systemd linger for a user. Throws on failure. */
export async function enableLinger(user: string): Promise<void> {
  const result = await exec("loginctl", ["enable-linger", user], { quiet: true });
  if (result.exitCode !== 0) {
    throw new Error(`loginctl enable-linger failed: ${result.stderr}`);
  }

  // Verify the linger file was created
  try {
    await readFile(`/var/lib/systemd/linger/${user}`);
  } catch {
    throw new Error(`linger file not created for ${user}`);
  }
}

/** Check if a systemd user service is enabled. */
export async function isEnabled(service: string): Promise<boolean> {
  const result = await exec("systemctl", ["--user", "is-enabled", service], { quiet: true });
  return result.exitCode === 0;
}

/** Check if a systemd user service is active. */
export async function isActive(service: string): Promise<boolean> {
  const result = await exec("systemctl", ["--user", "is-active", service], { quiet: true });
  return result.exitCode === 0 && result.stdout.trim() === "active";
}

/** Reload the systemd user daemon. */
export async function daemonReload(): Promise<void> {
  await exec("systemctl", ["--user", "daemon-reload"], { quiet: true });
}

/** Enable a systemd user service. Throws on failure. */
export async function enable(service: string): Promise<void> {
  const result = await exec("systemctl", ["--user", "enable", service], { quiet: true });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to enable ${service}: ${result.stderr}`);
  }
}
