import { exec } from "../exec.js";
import { rm } from "fs/promises";

/** Download a URL to a file path. */
export async function downloadFile(url: string, dest: string): Promise<void> {
  const result = await exec("curl", ["-fsSL", url, "-o", dest], { quiet: true });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to download ${url}: ${result.stderr}`);
  }
}

/** Download a URL to a temp script and execute via bash. Output is forwarded. */
export async function downloadAndRun(url: string, args: string[] = []): Promise<void> {
  const tmpScript = "/tmp/claw-installer.sh";
  await downloadFile(url, tmpScript);
  try {
    const result = await exec("bash", [tmpScript, ...args]);
    if (result.exitCode !== 0) {
      throw new Error(`Installer script failed: ${result.stderr}`);
    }
  } finally {
    await rm(tmpScript, { force: true });
  }
}
