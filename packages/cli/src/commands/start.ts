import type { VMDriver } from "@clawctl/host-core";
import { requireInstance } from "@clawctl/host-core";

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
}
