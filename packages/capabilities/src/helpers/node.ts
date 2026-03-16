import type { ProvisionContext, ProvisionResult } from "@clawctl/types";

const NODE_MAJOR_VERSION = 22;
const NODESOURCE_SETUP_URL = (majorVersion: number) =>
  `https://deb.nodesource.com/setup_${majorVersion}.x`;

/** Install Node.js via NodeSource and apt. */
export async function provision(ctx: ProvisionContext): Promise<ProvisionResult> {
  try {
    if (await ctx.commandExists("node")) {
      const v = (await ctx.exec("node", ["--version"], { quiet: true })).stdout.trim();
      if (v.includes(`v${NODE_MAJOR_VERSION}`)) {
        ctx.log(`Node.js ${v} already installed`);
        return { name: "nodejs", status: "unchanged", detail: v };
      }
    }

    ctx.log(`Installing Node.js ${NODE_MAJOR_VERSION}...`);
    await ctx.net.downloadAndRun(NODESOURCE_SETUP_URL(NODE_MAJOR_VERSION));
    const result = await ctx.exec("apt-get", ["install", "-y", "nodejs"]);
    if (result.exitCode !== 0) {
      throw new Error(`apt-get install nodejs failed: ${result.stderr}`);
    }
    const v = (await ctx.exec("node", ["--version"], { quiet: true })).stdout.trim();
    ctx.log(`Node.js ${v} installed`);
    return { name: "nodejs", status: "installed", detail: v };
  } catch (err) {
    return { name: "nodejs", status: "failed", error: String(err) };
  }
}
