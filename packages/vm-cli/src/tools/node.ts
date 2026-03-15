import { exec, commandExists } from "../exec.js";
import { log } from "../output.js";
import { downloadAndRun } from "./curl.js";
import type { ProvisionResult } from "./types.js";

const NODE_MAJOR_VERSION = 22;
const NODESOURCE_SETUP_URL = (majorVersion: number) =>
  `https://deb.nodesource.com/setup_${majorVersion}.x`;

/** Check if Node.js is installed. */
export async function isInstalled(): Promise<boolean> {
  return commandExists("node");
}

/** Get the installed Node.js version string (e.g. "v22.1.0"). */
export async function version(): Promise<string> {
  const result = await exec("node", ["--version"], { quiet: true });
  return result.stdout.trim();
}

/** Install Node.js via NodeSource and apt. Returns a ProvisionResult. */
export async function provision(): Promise<ProvisionResult> {
  try {
    if (await isInstalled()) {
      const v = await version();
      if (v.includes(`v${NODE_MAJOR_VERSION}`)) {
        log(`Node.js ${v} already installed`);
        return { name: "nodejs", status: "unchanged", detail: v };
      }
    }

    log(`Installing Node.js ${NODE_MAJOR_VERSION}...`);
    await downloadAndRun(NODESOURCE_SETUP_URL(NODE_MAJOR_VERSION));
    const result = await exec("apt-get", ["install", "-y", "nodejs"]);
    if (result.exitCode !== 0) {
      throw new Error(`apt-get install nodejs failed: ${result.stderr}`);
    }
    const v = await version();
    log(`Node.js ${v} installed`);
    return { name: "nodejs", status: "installed", detail: v };
  } catch (err) {
    return { name: "nodejs", status: "failed", error: String(err) };
  }
}
