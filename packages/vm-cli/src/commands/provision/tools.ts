import { exec, commandExists } from "../../exec.js";
import { log, ok, fail } from "../../output.js";
import { ensureInProfile, ensureDir, downloadFile } from "./helpers.js";

const HOMEBREW_INSTALL_URL = "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh";

const OP_VERSION = "2.30.0";
const OP_DOWNLOAD_URL = (version: string) =>
  `https://cache.agilebits.com/dist/1P/op2/pkg/v${version}/op_linux_arm64_v${version}.zip`;

interface ToolStep {
  name: string;
  status: "installed" | "already" | "failed";
  error?: string;
}

async function installHomebrew(): Promise<ToolStep> {
  try {
    if (await commandExists("brew")) {
      log("Homebrew already installed");
      // Still ensure profile entry
      await ensureInProfile('eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"');
      return { name: "homebrew", status: "already" };
    }

    log("Installing Homebrew...");
    await downloadFile(HOMEBREW_INSTALL_URL, "/tmp/brew-install.sh");
    const result = await exec("bash", ["/tmp/brew-install.sh"], {
      env: { ...process.env, NONINTERACTIVE: "1" },
    });
    await exec("rm", ["-f", "/tmp/brew-install.sh"]);
    if (result.exitCode !== 0) {
      throw new Error(`Homebrew install failed: ${result.stderr}`);
    }

    await ensureInProfile('eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"');

    log("Homebrew installed");
    return { name: "homebrew", status: "installed" };
  } catch (err) {
    return { name: "homebrew", status: "failed", error: String(err) };
  }
}

async function installOpCli(): Promise<ToolStep> {
  try {
    if (await commandExists("op")) {
      log("1Password CLI already installed");
      return { name: "op-cli", status: "already" };
    }

    log("Installing 1Password CLI...");
    await ensureDir(`${process.env.HOME}/.local/bin`);
    await downloadFile(OP_DOWNLOAD_URL(OP_VERSION), "/tmp/op.zip");
    await exec("unzip", ["-o", "/tmp/op.zip", "-d", "/tmp/op"]);
    await exec("mv", ["/tmp/op/op", `${process.env.HOME}/.local/bin/op`]);
    await exec("chmod", ["+x", `${process.env.HOME}/.local/bin/op`]);
    await exec("rm", ["-rf", "/tmp/op", "/tmp/op.zip"]);

    log("1Password CLI installed");
    return { name: "op-cli", status: "installed" };
  } catch (err) {
    return { name: "op-cli", status: "failed", error: String(err) };
  }
}

async function setupShellProfile(): Promise<ToolStep> {
  try {
    await ensureInProfile('export PATH="$HOME/.local/bin:$PATH"');
    log("Shell profile configured");
    return { name: "shell-profile", status: "installed" };
  } catch (err) {
    return { name: "shell-profile", status: "failed", error: String(err) };
  }
}

export async function runProvisionTools(): Promise<void> {
  log("=== User Tools Provisioning ===");

  const steps: ToolStep[] = [];

  log("--- Homebrew ---");
  steps.push(await installHomebrew());

  log("--- 1Password CLI ---");
  steps.push(await installOpCli());

  log("--- Shell profile ---");
  steps.push(await setupShellProfile());

  const failed = steps.filter((s) => s.status === "failed");
  if (failed.length > 0) {
    log("=== User tools provisioning failed ===");
    fail(
      failed.map((s) => `${s.name}: ${s.error}`),
      { steps },
    );
    process.exit(1);
  }

  log("=== User tools provisioning complete ===");
  ok({ steps });
}
