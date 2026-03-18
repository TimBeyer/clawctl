import { writeFile, rename, chmod, rm, mkdtemp } from "fs/promises";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { execa } from "execa";
import { CLAW_BIN_PATH } from "@clawctl/types";
import { deployClaw } from "./provision.js";
import { clawPath } from "./claw-binary.js";
import { loadRegistry, saveRegistry } from "./registry.js";
import { LimaDriver } from "./drivers/index.js";

/**
 * Download a release zip from the given URL and atomically replace the
 * current clawctl binary at process.execPath.
 */
export async function downloadAndReplace(assetUrl: string): Promise<void> {
  // Use same directory as the binary for atomic rename (same filesystem)
  const binaryDir = dirname(process.execPath);
  const tmpDir = await mkdtemp(join(binaryDir, ".clawctl-update-"));

  const zipPath = join(tmpDir, "clawctl.zip");
  const extractDir = join(tmpDir, "extracted");

  try {
    // Download
    const res = await fetch(assetUrl);
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(zipPath, buffer);

    // Extract — macOS ships with unzip
    await execa("unzip", ["-o", zipPath, "-d", extractDir]);

    // Atomic replace
    const extractedBinary = join(extractDir, "clawctl");
    await rename(extractedBinary, process.execPath);
    await chmod(process.execPath, 0o755);
  } finally {
    // Cleanup temp files
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export interface VmUpdateResult {
  name: string;
  status: "updated" | "pending" | "skipped";
  detail?: string;
}

/**
 * Push the new claw binary to all instances and run migrations.
 * Called by the NEW binary after self-replacement.
 */
export async function applyVmUpdates(configDir?: string): Promise<VmUpdateResult[]> {
  const registry = await loadRegistry(configDir);
  const driver = new LimaDriver();
  const results: VmUpdateResult[] = [];

  for (const [name, entry] of Object.entries(registry.instances)) {
    try {
      const vmStatus = await driver.status(entry.vmName);

      if (vmStatus === "Running") {
        // Push new claw binary
        await deployClaw(driver, entry.vmName, clawPath);

        // Run capability migrations only
        const migrateResult = await driver.exec(
          entry.vmName,
          `${CLAW_BIN_PATH} migrate --json`,
        );

        const detail =
          migrateResult.exitCode === 0
            ? "claw updated and migrations applied"
            : `claw updated, migrate exited ${migrateResult.exitCode}`;

        entry.clawVersion = undefined; // Will be set from package version by caller
        entry.pendingClawUpdate = false;
        results.push({ name, status: "updated", detail });
      } else if (vmStatus === "Stopped") {
        entry.pendingClawUpdate = true;
        results.push({ name, status: "pending", detail: "VM stopped — will update on next start" });
      } else {
        results.push({ name, status: "skipped", detail: `VM in unexpected state: ${vmStatus}` });
      }
    } catch (err) {
      results.push({
        name,
        status: "skipped",
        detail: `Error: ${err instanceof Error ? err.message : err}`,
      });
    }
  }

  await saveRegistry(registry, configDir);
  return results;
}
