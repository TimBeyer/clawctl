import { rm } from "fs/promises";
import type { VMDriver } from "../drivers/types.js";
import { getInstance, removeInstance } from "../lib/registry.js";

export async function runDelete(
  driver: VMDriver,
  name: string,
  opts: { purge?: boolean },
): Promise<void> {
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    process.exit(1);
  }

  // Delete VM if it exists
  if (await driver.exists(entry.vmName)) {
    console.log(`Deleting VM "${entry.vmName}"...`);
    await driver.delete(entry.vmName);
    console.log("VM deleted.");
  } else {
    console.log(`VM "${entry.vmName}" not found (already deleted?).`);
  }

  // Remove from registry
  await removeInstance(name);
  console.log("Removed from registry.");

  // Optionally purge project directory
  if (opts.purge) {
    console.log(`Removing project directory ${entry.projectDir}...`);
    await rm(entry.projectDir, { recursive: true, force: true });
    console.log("Project directory removed.");
  } else {
    console.log(`Project directory preserved at: ${entry.projectDir}`);
  }
}
