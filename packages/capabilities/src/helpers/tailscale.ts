import type { ProvisionContext, ProvisionResult } from "@clawctl/types";

const TAILSCALE_INSTALL_URL = "https://tailscale.com/install.sh";

/** Install Tailscale via the official installer. */
export async function provision(ctx: ProvisionContext): Promise<ProvisionResult> {
  try {
    if (await ctx.commandExists("tailscale")) {
      ctx.log("Tailscale already installed");
      return { name: "tailscale", status: "unchanged" };
    }

    ctx.log("Installing Tailscale...");
    await ctx.net.downloadAndRun(TAILSCALE_INSTALL_URL);
    ctx.log("Tailscale installed");
    return { name: "tailscale", status: "installed" };
  } catch (err) {
    return { name: "tailscale", status: "failed", error: String(err) };
  }
}
