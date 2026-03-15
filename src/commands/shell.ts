import type { VMDriver } from "../drivers/types.js";
import { requireInstance } from "../lib/require-instance.js";
import { shellQuote } from "../lib/shell-quote.js";

export async function runShell(
  driver: VMDriver,
  opts: { instance?: string },
  args?: string[],
): Promise<void> {
  const entry = await requireInstance(opts);

  if (args && args.length > 0) {
    const command = shellQuote(args);
    const result = await driver.execInteractive(entry.vmName, command);
    process.exit(result.exitCode);
  }

  const result = await driver.shell(entry.vmName);
  process.exit(result.exitCode);
}
