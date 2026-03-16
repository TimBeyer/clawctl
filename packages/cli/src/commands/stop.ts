import type { VMDriver } from "@clawctl/host-core";
import { requireInstance } from "@clawctl/host-core";
import { notifyDaemon } from "@clawctl/daemon";

export async function runStop(driver: VMDriver, opts: { instance?: string }): Promise<void> {
  const entry = await requireInstance(opts);

  const currentStatus = await driver.status(entry.vmName);
  if (currentStatus === "Stopped") {
    console.log(`Instance "${entry.name}" is already stopped.`);
    return;
  }

  console.log(`Stopping "${entry.name}"...`);
  await driver.stop(entry.vmName);
  console.log(`Instance "${entry.name}" stopped.`);
  await notifyDaemon();
}
