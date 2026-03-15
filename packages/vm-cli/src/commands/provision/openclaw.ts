import { exec, commandExists } from "../../exec.js";
import { log, ok, fail } from "../../output.js";
import { ensureInProfile } from "./helpers.js";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import { writeFile, mkdir } from "fs/promises";

const OPENCLAW_INSTALL_URL = "https://openclaw.ai/install.sh";

interface OpenclawStep {
  name: string;
  status: "installed" | "already" | "configured" | "failed";
  error?: string;
}

async function installOpenclaw(): Promise<OpenclawStep> {
  try {
    // Check with both PATH and the known install location
    const npmGlobalBin = `${process.env.HOME}/.npm-global/bin`;
    const pathWithNpmGlobal = `${npmGlobalBin}:${process.env.PATH}`;

    if (await commandExists("openclaw")) {
      const result = await exec("openclaw", ["--version"]);
      log(`OpenClaw ${result.stdout.trim()} already installed`);
      return { name: "openclaw-install", status: "already" };
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
      env: { ...process.env, PATH: pathWithNpmGlobal },
    });
    if (check.exitCode !== 0) {
      throw new Error("openclaw not found on PATH after installation");
    }

    log(`OpenClaw ${check.stdout.trim()} installed`);
    return { name: "openclaw-install", status: "installed" };
  } catch (err) {
    return { name: "openclaw-install", status: "failed", error: String(err) };
  }
}

async function configureEnvVars(): Promise<OpenclawStep> {
  try {
    await ensureInProfile(`export OPENCLAW_STATE_DIR=${PROJECT_MOUNT_POINT}/data/state`);
    await ensureInProfile(`export OPENCLAW_CONFIG_PATH=${PROJECT_MOUNT_POINT}/data/config`);
    log("OpenClaw env vars configured");
    return { name: "env-vars", status: "configured" };
  } catch (err) {
    return { name: "env-vars", status: "failed", error: String(err) };
  }
}

async function configureNpmGlobalPath(): Promise<OpenclawStep> {
  try {
    await ensureInProfile('export PATH="$HOME/.npm-global/bin:$PATH"');
    log("npm-global PATH configured");
    return { name: "npm-global-path", status: "configured" };
  } catch (err) {
    return { name: "npm-global-path", status: "failed", error: String(err) };
  }
}

async function setupGatewayStub(): Promise<OpenclawStep> {
  try {
    // Check if already enabled
    const check = await exec("systemctl", ["--user", "is-enabled", "openclaw-gateway.service"]);
    if (check.exitCode === 0) {
      log("openclaw-gateway.service already enabled, skipping stub");
      return { name: "gateway-stub", status: "already" };
    }

    const unitDir = `${process.env.HOME}/.config/systemd/user`;
    await mkdir(unitDir, { recursive: true });

    const unitContent = `[Unit]
Description=OpenClaw Gateway (stub — replaced by openclaw daemon install)

[Service]
ExecStart=/bin/true

[Install]
WantedBy=default.target
`;

    await writeFile(`${unitDir}/openclaw-gateway.service`, unitContent);

    await exec("systemctl", ["--user", "daemon-reload"]);
    const result = await exec("systemctl", ["--user", "enable", "openclaw-gateway.service"]);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to enable gateway stub: ${result.stderr}`);
    }

    log("gateway service stub enabled");
    return { name: "gateway-stub", status: "installed" };
  } catch (err) {
    return { name: "gateway-stub", status: "failed", error: String(err) };
  }
}

export async function runProvisionOpenclaw(): Promise<void> {
  log("=== OpenClaw Provisioning ===");

  const steps: OpenclawStep[] = [];

  log("--- OpenClaw ---");
  steps.push(await installOpenclaw());

  log("--- Environment variables ---");
  steps.push(await configureEnvVars());

  log("--- npm-global PATH ---");
  steps.push(await configureNpmGlobalPath());

  log("--- Gateway service stub ---");
  steps.push(await setupGatewayStub());

  const failed = steps.filter((s) => s.status === "failed");
  if (failed.length > 0) {
    log("=== OpenClaw provisioning failed ===");
    fail(
      failed.map((s) => `${s.name}: ${s.error}`),
      { steps },
    );
    process.exit(1);
  }

  log("=== OpenClaw provisioning complete ===");
  ok({ steps });
}
