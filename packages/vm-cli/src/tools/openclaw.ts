import { exec, commandExists } from "../exec.js";

/** Check if openclaw is on PATH. */
export async function isInstalled(): Promise<boolean> {
  return commandExists("openclaw");
}

/** Get the installed openclaw version string. */
export async function version(): Promise<string> {
  const npmGlobalBin = `${process.env.HOME}/.npm-global/bin`;
  const result = await exec("openclaw", ["--version"], {
    quiet: true,
    env: { ...process.env, PATH: `${npmGlobalBin}:${process.env.PATH}` },
  });
  return result.stdout.trim();
}

/** Run openclaw doctor. Returns exit code 0 on success. */
export async function doctor(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return exec("openclaw", ["doctor"], { quiet: true });
}
