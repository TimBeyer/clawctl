import type { VMDriver } from "../drivers/types.js";
import { requireInstance } from "../lib/require-instance.js";
import { refreshOcCompletionsIfStale } from "./completions.js";

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
  await refreshOcCompletionsIfStale(driver, entry.vmName);
}
