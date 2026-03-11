import type { VMDriver } from "../drivers/types.js";
import { getInstance } from "../lib/registry.js";

export async function runShell(driver: VMDriver, name: string): Promise<void> {
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    process.exit(1);
  }

  const result = await driver.shell(entry.vmName);
  process.exit(result.exitCode);
}
