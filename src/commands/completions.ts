import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { VMDriver } from "../drivers/types.js";
import { BIN_NAME } from "../lib/bin-name.js";
import { requireInstance } from "../lib/require-instance.js";
import { generateBashCompletion, generateZshCompletion } from "../templates/completions/index.js";

const OC_CACHE_DIR = join(homedir(), ".config", "clawctl");

export async function runCompletions(shell: string): Promise<void> {
  let script: string;
  let rcFile: string;

  switch (shell) {
    case "bash":
      script = generateBashCompletion(BIN_NAME);
      rcFile = "~/.bashrc";
      break;
    case "zsh":
      script = generateZshCompletion(BIN_NAME);
      rcFile = "~/.zshrc";
      break;
    default:
      console.error(`Unsupported shell: ${shell}`);
      console.error("Supported shells: bash, zsh");
      process.exit(1);
  }

  // Print the script to stdout (for eval or piping)
  process.stdout.write(script);

  // Print install instructions to stderr only when stdout is a TTY
  // (i.e. the user ran `clawctl completions zsh` directly, not via eval/pipe)
  if (process.stdout.isTTY) {
    process.stderr.write(`\n# Add this to ${rcFile}:\n`);
    process.stderr.write(`#   eval "$(${BIN_NAME} completions ${shell})"\n`);
  }
}

export async function runCompletionsUpdateOc(
  driver: VMDriver,
  opts: { instance?: string },
): Promise<void> {
  const entry = await requireInstance(opts);

  const status = await driver.status(entry.vmName);
  if (status !== "Running") {
    console.error(`Instance "${entry.name}" is not running (status: ${status})`);
    process.exit(1);
  }

  await mkdir(OC_CACHE_DIR, { recursive: true });

  let updated = 0;
  for (const shell of ["zsh", "bash"] as const) {
    const result = await driver.exec(entry.vmName, `openclaw completion --shell ${shell}`);
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      console.error(`Warning: failed to get ${shell} completions from openclaw`);
      if (result.stderr.trim()) console.error(result.stderr.trim());
      continue;
    }
    const cachePath = join(OC_CACHE_DIR, `oc-completions.${shell}`);
    await Bun.write(cachePath, result.stdout);
    updated++;
    console.log(`Cached ${shell} completions → ${cachePath}`);
  }

  if (updated > 0) {
    console.log(`\nReload your shell to pick up openclaw completions.`);
  }
}
