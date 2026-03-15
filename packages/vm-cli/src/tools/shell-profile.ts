import { access } from "fs/promises";
import { constants } from "fs";
import { ensureLineInFile } from "./fs.js";

/** Ensure a line exists in ~/.bashrc. */
export async function ensureInBashrc(line: string): Promise<boolean> {
  const home = process.env.HOME ?? "/root";
  return ensureLineInFile(`${home}/.bashrc`, line);
}

/**
 * Ensure a line exists in login profile files (~/.profile and ~/.bash_profile if present).
 * These are sourced by login shells regardless of interactive mode.
 */
export async function ensureInProfile(line: string): Promise<void> {
  const home = process.env.HOME ?? "/root";
  await ensureLineInFile(`${home}/.profile`, line);

  // bash reads ~/.bash_profile instead of ~/.profile when it exists
  const bashProfile = `${home}/.bash_profile`;
  try {
    await access(bashProfile, constants.F_OK);
    await ensureLineInFile(bashProfile, line);
  } catch {
    // ~/.bash_profile doesn't exist — skip
  }
}

/** Add a path entry to login profile. */
export async function ensurePath(pathEntry: string): Promise<void> {
  await ensureInProfile(`export PATH="${pathEntry}:$PATH"`);
}
