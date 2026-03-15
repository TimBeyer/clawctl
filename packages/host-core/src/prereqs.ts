import os from "os";
import { commandExists } from "./exec.js";
import type { VMDriver } from "./drivers/types.js";

export interface PrereqStatus {
  isMacOS: boolean;
  isArm64: boolean;
  hasHomebrew: boolean;
  hasVMBackend: boolean;
  vmBackendVersion?: string;
}

/** Check all host prerequisites: macOS, arm64, Homebrew, VM backend. */
export async function checkPrereqs(driver: VMDriver): Promise<PrereqStatus> {
  const isMacOS = os.platform() === "darwin";
  const isArm64 = os.arch() === "arm64";
  const hasHomebrew = await commandExists("brew");
  const vmBackendVersion = await driver.version();
  const hasVMBackend = !!vmBackendVersion;

  return { isMacOS, isArm64, hasHomebrew, hasVMBackend, vmBackendVersion };
}
