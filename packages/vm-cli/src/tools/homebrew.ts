import { exec, commandExists } from "../exec.js";
import { log } from "../output.js";
import { downloadFile } from "./curl.js";
import { ensureInProfile } from "./shell-profile.js";
import { rm } from "fs/promises";
import type { ProvisionResult } from "./types.js";

const HOMEBREW_INSTALL_URL = "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh";
const BREW_SHELLENV = 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"';

/** Check if Homebrew is installed. */
export async function isInstalled(): Promise<boolean> {
  return commandExists("brew");
}

/** Run the Homebrew installer script. Throws on failure. */
export async function install(): Promise<void> {
  const tmpScript = "/tmp/brew-install.sh";
  await downloadFile(HOMEBREW_INSTALL_URL, tmpScript);
  try {
    const result = await exec("bash", [tmpScript], {
      env: { ...process.env, NONINTERACTIVE: "1" },
    });
    if (result.exitCode !== 0) {
      throw new Error(`Homebrew install failed: ${result.stderr}`);
    }
  } finally {
    await rm(tmpScript, { force: true });
  }
}

/** Install Homebrew and configure the shell profile. Returns a ProvisionResult. */
export async function provision(): Promise<ProvisionResult> {
  try {
    if (await isInstalled()) {
      log("Homebrew already installed");
      // Still ensure profile entry
      await ensureInProfile(BREW_SHELLENV);
      return { name: "homebrew", status: "unchanged" };
    }

    log("Installing Homebrew...");
    await install();
    await ensureInProfile(BREW_SHELLENV);
    log("Homebrew installed");
    return { name: "homebrew", status: "installed" };
  } catch (err) {
    return { name: "homebrew", status: "failed", error: String(err) };
  }
}
