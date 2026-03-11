import type { VMDriver } from "../drivers/types.js";
import { getInstance } from "../lib/registry.js";

export async function runStop(driver: VMDriver, name: string): Promise<void> {
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    process.exit(1);
  }

  const currentStatus = await driver.status(entry.vmName);
  if (currentStatus === "Stopped") {
    console.log(`Instance "${name}" is already stopped.`);
    return;
  }

  console.log(`Stopping "${name}"...`);
  await driver.stop(entry.vmName);
  console.log(`Instance "${name}" stopped.`);
}
