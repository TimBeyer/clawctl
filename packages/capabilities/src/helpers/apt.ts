import type { ProvisionContext, ProvisionResult } from "@clawctl/types";

/** Check if an apt package is installed. */
export async function isInstalled(ctx: ProvisionContext, pkg: string): Promise<boolean> {
  const result = await ctx.exec("dpkg", ["-l", pkg], { quiet: true });
  return result.exitCode === 0 && result.stdout.includes("ii");
}

/** Ensure all given packages are installed. */
export async function ensure(ctx: ProvisionContext, packages: string[]): Promise<ProvisionResult> {
  try {
    const toInstall: string[] = [];
    for (const pkg of packages) {
      if (!(await isInstalled(ctx, pkg))) {
        toInstall.push(pkg);
      }
    }

    if (toInstall.length === 0) {
      ctx.log("All apt packages already installed");
      return { name: "apt-packages", status: "unchanged" };
    }

    ctx.log(`Installing apt packages: ${toInstall.join(" ")}`);
    await ctx.exec("apt-get", ["update", "-qq"]);
    const result = await ctx.exec("apt-get", ["install", "-y", "-qq", ...toInstall]);
    if (result.exitCode !== 0) {
      throw new Error(`apt-get install failed: ${result.stderr}`);
    }
    return { name: "apt-packages", status: "installed", detail: toInstall.join(", ") };
  } catch (err) {
    return { name: "apt-packages", status: "failed", error: String(err) };
  }
}
