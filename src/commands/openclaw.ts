import type { VMDriver } from "../drivers/types.js";
import { requireInstance } from "../lib/require-instance.js";
import { shellQuote } from "../lib/shell-quote.js";
import { refreshOcCompletionsIfStale } from "./completions.js";

export async function runOpenclaw(
  driver: VMDriver,
  opts: { instance?: string },
  args: string[],
): Promise<void> {
  const entry = await requireInstance(opts);
  const command = shellQuote(["openclaw", ...args]);
  const result = await driver.execInteractive(entry.vmName, command);
  await refreshOcCompletionsIfStale(driver, entry.vmName);
  process.exit(result.exitCode);
}
