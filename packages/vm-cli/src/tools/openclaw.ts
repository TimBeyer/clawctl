import { exec, commandExists } from "../exec.js";
import { log } from "../output.js";
import { ensureInProfile } from "./shell-profile.js";
import * as systemd from "./systemd.js";
import { ensureDir } from "./fs.js";
import { writeFile } from "fs/promises";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import type { ProvisionResult } from "./types.js";

const OPENCLAW_INSTALL_URL = "https://openclaw.ai/install.sh";

const GATEWAY_UNIT = `[Unit]
Description=OpenClaw Gateway (stub — replaced by openclaw daemon install)

[Service]
ExecStart=/bin/true

[Install]
WantedBy=default.target
`;

/** Check if openclaw is on PATH. */
export async function isInstalled(): Promise<boolean> {
  return commandExists("openclaw");
}

/** Get the installed openclaw version string. */
export async function version(): Promise<string> {
  const npmGlobalBin = `${process.env.HOME}/.npm-global/bin`;
  const result = await exec("openclaw", ["--version"], {
    quiet: true,
    env: { ...process.env, PATH: `${npmGlobalBin}:${process.env.PATH}` },
  });
  return result.stdout.trim();
}

/** Run openclaw doctor. Returns exit code 0 on success. */
export async function doctor(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return exec("openclaw", ["doctor"], { quiet: true });
}

/** Install openclaw via the official installer. Returns a ProvisionResult. */
export async function provision(): Promise<ProvisionResult> {
  try {
    const npmGlobalBin = `${process.env.HOME}/.npm-global/bin`;
    const pathWithNpmGlobal = `${npmGlobalBin}:${process.env.PATH}`;

    if (await isInstalled()) {
      const v = await version();
      log(`OpenClaw ${v} already installed`);
      return { name: "openclaw-install", status: "unchanged", detail: v };
    }

    log("Installing OpenClaw...");
    const result = await exec(
      "bash",
      ["-c", `curl -fsSL ${OPENCLAW_INSTALL_URL} | bash -s -- --no-onboard --no-prompt`],
      { env: { ...process.env, PATH: pathWithNpmGlobal } },
    );
    if (result.exitCode !== 0) {
      throw new Error(`OpenClaw install failed: ${result.stderr}`);
    }

    // Verify installation
    const check = await exec("openclaw", ["--version"], {
      quiet: true,
      env: { ...process.env, PATH: pathWithNpmGlobal },
    });
    if (check.exitCode !== 0) {
      throw new Error("openclaw not found on PATH after installation");
    }

    const v = check.stdout.trim();
    log(`OpenClaw ${v} installed`);
    return { name: "openclaw-install", status: "installed", detail: v };
  } catch (err) {
    return { name: "openclaw-install", status: "failed", error: String(err) };
  }
}

/** Configure OpenClaw environment variables in the shell profile. */
export async function provisionEnvVars(): Promise<ProvisionResult> {
  try {
    await ensureInProfile(`export OPENCLAW_STATE_DIR=${PROJECT_MOUNT_POINT}/data/state`);
    await ensureInProfile(`export OPENCLAW_CONFIG_PATH=${PROJECT_MOUNT_POINT}/data/config`);
    log("OpenClaw env vars configured");
    return { name: "env-vars", status: "installed" };
  } catch (err) {
    return { name: "env-vars", status: "failed", error: String(err) };
  }
}

/** Ensure ~/.npm-global/bin is on the PATH in login profile. */
export async function provisionNpmGlobalPath(): Promise<ProvisionResult> {
  try {
    await ensureInProfile('export PATH="$HOME/.npm-global/bin:$PATH"');
    log("npm-global PATH configured");
    return { name: "npm-global-path", status: "installed" };
  } catch (err) {
    return { name: "npm-global-path", status: "failed", error: String(err) };
  }
}

/** Create and enable the gateway stub systemd service. */
export async function provisionGatewayStub(): Promise<ProvisionResult> {
  try {
    if (await systemd.isEnabled("openclaw-gateway.service")) {
      log("openclaw-gateway.service already enabled, skipping stub");
      return { name: "gateway-stub", status: "unchanged" };
    }

    const unitDir = `${process.env.HOME}/.config/systemd/user`;
    await ensureDir(unitDir);
    await writeFile(`${unitDir}/openclaw-gateway.service`, GATEWAY_UNIT);

    await systemd.daemonReload();
    await systemd.enable("openclaw-gateway.service");

    log("gateway service stub enabled");
    return { name: "gateway-stub", status: "installed" };
  } catch (err) {
    return { name: "gateway-stub", status: "failed", error: String(err) };
  }
}
