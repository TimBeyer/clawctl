import type { VMDriver } from "@clawctl/host-core";
import {
  requireInstance,
  deployClaw,
  clawPath,
  loadRegistry,
  saveRegistry,
} from "@clawctl/host-core";
import { CLAW_BIN_PATH } from "@clawctl/types";
import { notifyDaemon } from "@clawctl/daemon";

export async function runStart(driver: VMDriver, opts: { instance?: string }): Promise<void> {
  const entry = await requireInstance(opts);

  const currentStatus = await driver.status(entry.vmName);
  if (currentStatus === "Running") {
    console.log(`Instance "${entry.name}" is already running.`);
    return;
  }

  console.log(`Starting "${entry.name}"...`);
  await driver.start(entry.vmName);
  console.log(`Instance "${entry.name}" started.`);

  // Apply pending claw update if the binary was replaced while VM was stopped
  if (entry.pendingClawUpdate) {
    console.log("Applying pending claw update...");
    try {
      await deployClaw(driver, entry.vmName, clawPath);
      const migrateResult = await driver.exec(entry.vmName, `${CLAW_BIN_PATH} migrate --json`);
      if (migrateResult.exitCode !== 0) {
        console.error(`Warning: claw migrate exited ${migrateResult.exitCode}`);
      }

      // Clear the pending flag
      const registry = await loadRegistry();
      const current = registry.instances[entry.name];
      if (current) {
        current.pendingClawUpdate = false;
        current.clawVersion = undefined;
        await saveRegistry(registry);
      }
      console.log("Claw update applied.");
    } catch (err) {
      console.error(
        `Warning: pending claw update failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  await notifyDaemon();
}
