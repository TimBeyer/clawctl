import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { VMDriver } from "../drivers/types.js";
import { BIN_NAME } from "../lib/bin-name.js";
import { requireInstance } from "../lib/require-instance.js";
import { listInstances } from "../lib/registry.js";
import { generateBashCompletion, generateZshCompletion } from "../templates/completions/index.js";

const OC_CACHE_DIR = join(homedir(), ".config", "clawctl");

function ocCachePath(shell: string): string {
  return join(OC_CACHE_DIR, `oc-completions.${shell}`);
}

async function cacheExists(shell: string): Promise<boolean> {
  try {
    await stat(ocCachePath(shell));
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch openclaw completion scripts from a VM and write them to the cache.
 * Returns true if at least one shell was cached successfully.
 */
async function fetchAndCacheOcCompletions(driver: VMDriver, vmName: string): Promise<boolean> {
  await mkdir(OC_CACHE_DIR, { recursive: true });
  let updated = 0;
  for (const shell of ["zsh", "bash"] as const) {
    try {
      const result = await driver.exec(vmName, `openclaw completion --shell ${shell}`);
      if (result.exitCode === 0 && result.stdout.trim()) {
        await Bun.write(ocCachePath(shell), result.stdout);
        updated++;
      }
    } catch {
      // VM might have gone away — ignore
    }
  }
  return updated > 0;
}

/**
 * Find a running VM from the registry, returns the vmName or undefined.
 */
async function findRunningVm(driver: VMDriver): Promise<string | undefined> {
  const entries = await listInstances();
  for (const entry of entries) {
    try {
      const s = await driver.status(entry.vmName);
      if (s === "Running") return entry.vmName;
    } catch {
      continue;
    }
  }
  return undefined;
}

// -- Public API ---------------------------------------------------------------

export async function runCompletions(shell: string, driver: VMDriver): Promise<void> {
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

  // On first invocation (no cache), try to populate from a running VM.
  // This adds a one-time delay on first shell startup but gives full
  // openclaw completions from the start.
  if (!(await cacheExists(shell))) {
    const vmName = await findRunningVm(driver);
    if (vmName) {
      await fetchAndCacheOcCompletions(driver, vmName);
    }
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

  const updated = await fetchAndCacheOcCompletions(driver, entry.vmName);
  if (updated) {
    console.log("Cached openclaw completions for bash and zsh.");
    console.log("Reload your shell to pick up the changes.");
  }
}
