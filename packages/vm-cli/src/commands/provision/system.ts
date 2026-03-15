import { exec, commandExists } from "../../exec.js";
import { log, ok, fail } from "../../output.js";
import { ensureAptPackages, downloadAndRun } from "./helpers.js";

const APT_PACKAGES = ["build-essential", "git", "curl", "unzip", "jq", "ca-certificates", "gnupg"];

const NODE_MAJOR_VERSION = 22;
const NODESOURCE_SETUP_URL = (majorVersion: number) =>
  `https://deb.nodesource.com/setup_${majorVersion}.x`;

const TAILSCALE_INSTALL_URL = "https://tailscale.com/install.sh";

interface SystemStep {
  name: string;
  status: "installed" | "already" | "failed";
  error?: string;
}

async function installAptPackages(): Promise<SystemStep> {
  try {
    const installed = await ensureAptPackages(APT_PACKAGES);
    return {
      name: "apt-packages",
      status: installed.length > 0 ? "installed" : "already",
    };
  } catch (err) {
    return { name: "apt-packages", status: "failed", error: String(err) };
  }
}

async function installNodejs(): Promise<SystemStep> {
  try {
    if (await commandExists("node")) {
      const result = await exec("node", ["--version"]);
      if (result.stdout.includes(`v${NODE_MAJOR_VERSION}`)) {
        log(`Node.js ${result.stdout.trim()} already installed`);
        return { name: "nodejs", status: "already" };
      }
    }

    log(`Installing Node.js ${NODE_MAJOR_VERSION}...`);
    await downloadAndRun(NODESOURCE_SETUP_URL(NODE_MAJOR_VERSION));
    const result = await exec("apt-get", ["install", "-y", "nodejs"]);
    if (result.exitCode !== 0) {
      throw new Error(`apt-get install nodejs failed: ${result.stderr}`);
    }
    const version = await exec("node", ["--version"]);
    log(`Node.js ${version.stdout.trim()} installed`);
    return { name: "nodejs", status: "installed" };
  } catch (err) {
    return { name: "nodejs", status: "failed", error: String(err) };
  }
}

async function enableSystemdLinger(): Promise<SystemStep> {
  try {
    // Determine the default non-root user
    let user = process.env.SUDO_USER ?? "";
    if (!user) {
      const result = await exec("awk", [
        "-F:",
        "$3 >= 1000 && $3 < 65534 { print $1; exit }",
        "/etc/passwd",
      ]);
      user = result.stdout.trim();
    }

    if (!user) {
      throw new Error("Could not determine default user for linger");
    }

    const result = await exec("loginctl", ["enable-linger", user]);
    if (result.exitCode !== 0) {
      throw new Error(`loginctl enable-linger failed: ${result.stderr}`);
    }

    // Verify
    const { readFile } = await import("fs/promises");
    try {
      await readFile(`/var/lib/systemd/linger/${user}`);
    } catch {
      throw new Error(`linger file not created for ${user}`);
    }

    log(`systemd linger enabled for ${user}`);
    return { name: "systemd-linger", status: "installed" };
  } catch (err) {
    return { name: "systemd-linger", status: "failed", error: String(err) };
  }
}

async function installTailscale(): Promise<SystemStep> {
  try {
    if (await commandExists("tailscale")) {
      log("Tailscale already installed");
      return { name: "tailscale", status: "already" };
    }

    log("Installing Tailscale...");
    await downloadAndRun(TAILSCALE_INSTALL_URL);
    log("Tailscale installed");
    return { name: "tailscale", status: "installed" };
  } catch (err) {
    return { name: "tailscale", status: "failed", error: String(err) };
  }
}

export async function runProvisionSystem(): Promise<void> {
  log("=== System Provisioning ===");

  const steps: SystemStep[] = [];

  log("--- APT packages ---");
  steps.push(await installAptPackages());

  log(`--- Node.js ${NODE_MAJOR_VERSION} ---`);
  steps.push(await installNodejs());

  log("--- systemd linger ---");
  steps.push(await enableSystemdLinger());

  log("--- Tailscale ---");
  steps.push(await installTailscale());

  const failed = steps.filter((s) => s.status === "failed");
  if (failed.length > 0) {
    log("=== System provisioning failed ===");
    fail(
      failed.map((s) => `${s.name}: ${s.error}`),
      { steps },
    );
    process.exit(1);
  }

  log("=== System provisioning complete ===");
  ok({ steps });
}
