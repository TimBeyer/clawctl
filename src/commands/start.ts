import type { VMDriver } from "../drivers/types.js";
import { getInstance } from "../lib/registry.js";

export async function runStart(driver: VMDriver, name: string): Promise<void> {
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    process.exit(1);
  }

  const currentStatus = await driver.status(entry.vmName);
  if (currentStatus === "Running") {
    console.log(`Instance "${name}" is already running.`);
    return;
  }

  console.log(`Starting "${name}"...`);
  await driver.start(entry.vmName);
  console.log(`Instance "${name}" started.`);
}
