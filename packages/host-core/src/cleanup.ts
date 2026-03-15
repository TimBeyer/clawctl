import { rm } from "fs/promises";
import type { VMDriver } from "./drivers/types.js";

type Log = (message: string) => void;

/** Remove the VM and project directory. Best-effort — never throws. */
export async function cleanupVM(
  driver: VMDriver,
  vmName: string,
  projectDir: string,
  log: Log = (msg) => console.error(`[cleanup] ${msg}`),
): Promise<void> {
  try {
    if (await driver.exists(vmName)) {
      log(`Deleting VM "${vmName}"...`);
      await driver.delete(vmName);
      log("VM deleted");
    }
  } catch (err) {
    log(`Warning: failed to delete VM: ${err}`);
  }

  try {
    log(`Removing project directory ${projectDir}...`);
    await rm(projectDir, { recursive: true, force: true });
    log("Project directory removed");
  } catch (err) {
    log(`Warning: failed to remove project directory: ${err}`);
  }
}

export interface CleanupTarget {
  vmName: string;
  projectDir: string;
}

/**
 * Register SIGINT/SIGTERM handlers that clean up a VM on interrupt.
 *
 * `getTarget` is called when a signal fires — return undefined to skip
 * cleanup (e.g. if VM creation hasn't started yet).
 *
 * Returns a dispose function that removes the handlers.
 */
export function onSignalCleanup(
  driver: VMDriver,
  getTarget: () => CleanupTarget | undefined,
  log: Log = (msg) => console.error(`[cleanup] ${msg}`),
): () => void {
  let cleaning = false;

  const handler = async (signal: string) => {
    if (cleaning) return;
    cleaning = true;

    const target = getTarget();
    if (target) {
      log(`Caught ${signal}, cleaning up...`);
      await cleanupVM(driver, target.vmName, target.projectDir, log);
    }
    process.exit(signal === "SIGTERM" ? 143 : 130);
  };

  const onInt = () => {
    handler("SIGINT");
  };
  const onTerm = () => {
    handler("SIGTERM");
  };

  process.on("SIGINT", onInt);
  process.on("SIGTERM", onTerm);

  return () => {
    process.off("SIGINT", onInt);
    process.off("SIGTERM", onTerm);
  };
}
