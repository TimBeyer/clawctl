import type { VMDriver } from "../drivers/types.js";
import { getInstance } from "../lib/registry.js";
import { BIN_NAME } from "../lib/bin-name.js";

export async function runStatus(driver: VMDriver, name: string): Promise<void> {
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    console.error(`Run '${BIN_NAME} list' to see registered instances.`);
    process.exit(1);
  }

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
