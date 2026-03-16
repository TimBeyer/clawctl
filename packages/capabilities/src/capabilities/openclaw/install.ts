import type { CapabilityContext, ProvisionResult } from "@clawctl/types";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";

const OPENCLAW_INSTALL_URL = "https://openclaw.ai/install.sh";

const GATEWAY_UNIT = `[Unit]
Description=OpenClaw Gateway (stub — replaced by openclaw daemon install)

[Service]
ExecStart=/bin/true

[Install]
WantedBy=default.target
`;

/** Install openclaw via the official installer. */
export async function provisionOpenclaw(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    const npmGlobalBin = `${process.env.HOME}/.npm-global/bin`;
    const pathWithNpmGlobal = `${npmGlobalBin}:${process.env.PATH}`;

    if (await ctx.commandExists("openclaw")) {
      const v = (
        await ctx.exec("openclaw", ["--version"], {
          quiet: true,
          env: { ...process.env, PATH: pathWithNpmGlobal },
        })
      ).stdout.trim();
      ctx.log(`OpenClaw ${v} already installed`);
      return { name: "openclaw-install", status: "unchanged", detail: v };
    }

    ctx.log("Installing OpenClaw...");
    const result = await ctx.exec(
      "bash",
      ["-c", `curl -fsSL ${OPENCLAW_INSTALL_URL} | bash -s -- --no-onboard --no-prompt`],
      { env: { ...process.env, PATH: pathWithNpmGlobal } },
    );
    if (result.exitCode !== 0) {
      throw new Error(`OpenClaw install failed: ${result.stderr}`);
    }

    // Verify installation
    const check = await ctx.exec("openclaw", ["--version"], {
      quiet: true,
      env: { ...process.env, PATH: pathWithNpmGlobal },
    });
    if (check.exitCode !== 0) {
      throw new Error("openclaw not found on PATH after installation");
    }

    const v = check.stdout.trim();
    ctx.log(`OpenClaw ${v} installed`);
    return { name: "openclaw-install", status: "installed", detail: v };
  } catch (err) {
    return { name: "openclaw-install", status: "failed", error: String(err) };
  }
}

/** Configure OpenClaw environment variables in the shell profile. */
export async function provisionEnvVars(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    await ctx.profile.ensureInProfile(
      `export OPENCLAW_STATE_DIR=${PROJECT_MOUNT_POINT}/data/state`,
    );
    await ctx.profile.ensureInProfile(
      `export OPENCLAW_CONFIG_PATH=${PROJECT_MOUNT_POINT}/data/config`,
    );
    ctx.log("OpenClaw env vars configured");
    return { name: "env-vars", status: "installed" };
  } catch (err) {
    return { name: "env-vars", status: "failed", error: String(err) };
  }
}

/** Ensure ~/.npm-global/bin is on the PATH in login profile. */
export async function provisionNpmGlobalPath(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    await ctx.profile.ensureInProfile('export PATH="$HOME/.npm-global/bin:$PATH"');
    ctx.log("npm-global PATH configured");
    return { name: "npm-global-path", status: "installed" };
  } catch (err) {
    return { name: "npm-global-path", status: "failed", error: String(err) };
  }
}

/** Create and enable the gateway stub systemd service. */
export async function provisionGatewayStub(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    if (await ctx.systemd.isEnabled("openclaw-gateway.service")) {
      ctx.log("openclaw-gateway.service already enabled, skipping stub");
      return { name: "gateway-stub", status: "unchanged" };
    }

    const unitDir = `${process.env.HOME}/.config/systemd/user`;
    await ctx.fs.ensureDir(unitDir);
    await ctx.fs.writeFile(`${unitDir}/openclaw-gateway.service`, GATEWAY_UNIT);

    await ctx.systemd.daemonReload();
    await ctx.systemd.enable("openclaw-gateway.service");

    ctx.log("gateway service stub enabled");
    return { name: "gateway-stub", status: "installed" };
  } catch (err) {
    return { name: "gateway-stub", status: "failed", error: String(err) };
  }
}
