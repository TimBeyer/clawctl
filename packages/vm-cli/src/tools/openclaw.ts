import { exec, commandExists } from "../exec.js";

/** Check if openclaw is on PATH. */
export async function isInstalled(): Promise<boolean> {
  return commandExists("openclaw");
}

/** Run openclaw doctor. Returns exit code 0 on success. */
export async function doctor(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return exec("openclaw", ["doctor"], { quiet: true });
}
