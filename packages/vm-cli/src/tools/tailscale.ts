import { commandExists } from "../exec.js";
import { log } from "../output.js";
import { downloadAndRun } from "./curl.js";
import type { ProvisionResult } from "./types.js";

const TAILSCALE_INSTALL_URL = "https://tailscale.com/install.sh";

/** Check if Tailscale is installed. */
export async function isInstalled(): Promise<boolean> {
  return commandExists("tailscale");
}

/** Install Tailscale via the official installer. Returns a ProvisionResult. */
export async function provision(): Promise<ProvisionResult> {
  try {
    if (await isInstalled()) {
      log("Tailscale already installed");
      return { name: "tailscale", status: "unchanged" };
    }

    log("Installing Tailscale...");
    await downloadAndRun(TAILSCALE_INSTALL_URL);
    log("Tailscale installed");
    return { name: "tailscale", status: "installed" };
  } catch (err) {
    return { name: "tailscale", status: "failed", error: String(err) };
  }
}
