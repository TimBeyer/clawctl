import type { VMDriver } from "@clawctl/host-core";
import { requireInstance } from "@clawctl/host-core";

export async function runStatus(driver: VMDriver, opts: { instance?: string }): Promise<void> {
  const entry = await requireInstance(opts);

  const liveStatus = await driver.status(entry.vmName);

  const lines: [string, string][] = [
    ["Name", entry.name],
    ["Status", liveStatus],
    ["Project", entry.projectDir],
    ["VM Name", entry.vmName],
    ["Driver", entry.driver],
    ["Provider", entry.providerType ?? "-"],
    ["Gateway", `http://localhost:${entry.gatewayPort}`],
    ["Created", entry.createdAt],
    ["Shell", driver.shellCommand(entry.vmName)],
  ];

  const labelWidth = Math.max(...lines.map(([label]) => label.length));
  for (const [label, value] of lines) {
    console.log(`${label.padEnd(labelWidth)}  ${value}`);
  }
}
