import { exec } from "../exec.js";
import { log } from "../output.js";
import type { ProvisionResult } from "./types.js";

/** Check if an apt package is installed. */
export async function isInstalled(pkg: string): Promise<boolean> {
  const result = await exec("dpkg", ["-l", pkg], { quiet: true });
  return result.exitCode === 0 && result.stdout.includes("ii");
}

/** Run apt-get update. */
export async function update(): Promise<void> {
  await exec("apt-get", ["update", "-qq"]);
}

/** Install one or more apt packages. Throws on failure. */
export async function install(packages: string[]): Promise<void> {
  const result = await exec("apt-get", ["install", "-y", "-qq", ...packages]);
  if (result.exitCode !== 0) {
    throw new Error(`apt-get install failed: ${result.stderr}`);
  }
}

/** Ensure all given packages are installed. Returns a ProvisionResult. */
export async function ensure(packages: string[]): Promise<ProvisionResult> {
  try {
    const toInstall: string[] = [];
    for (const pkg of packages) {
      if (!(await isInstalled(pkg))) {
        toInstall.push(pkg);
      }
    }

    if (toInstall.length === 0) {
      log("All apt packages already installed");
      return { name: "apt-packages", status: "unchanged" };
    }

    log(`Installing apt packages: ${toInstall.join(" ")}`);
    await update();
    await install(toInstall);
    return { name: "apt-packages", status: "installed", detail: toInstall.join(", ") };
  } catch (err) {
    return { name: "apt-packages", status: "failed", error: String(err) };
  }
}
