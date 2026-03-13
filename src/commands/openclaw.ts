import type { VMDriver } from "../drivers/types.js";
import { requireInstance } from "../lib/require-instance.js";
import { shellQuote } from "../lib/shell-quote.js";

export async function runOpenclaw(
  driver: VMDriver,
  opts: { instance?: string },
  args: string[],
): Promise<void> {
  const entry = await requireInstance(opts);
  const command = shellQuote(["openclaw", ...args]);
  const result = await driver.execInteractive(entry.vmName, command);
  process.exit(result.exitCode);
}
