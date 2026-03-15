import { exec, commandExists } from "../../exec.js";
import { log } from "../../output.js";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import { constants } from "fs";

export { commandExists };

/** Check if an apt package is installed. */
export async function isAptPackageInstalled(pkg: string): Promise<boolean> {
  const result = await exec("dpkg", ["-l", pkg]);
  return result.exitCode === 0 && result.stdout.includes("ii");
}

/** Install missing apt packages. Idempotent — skips already-installed packages. */
export async function ensureAptPackages(packages: string[]): Promise<string[]> {
  const toInstall: string[] = [];
  for (const pkg of packages) {
    if (!(await isAptPackageInstalled(pkg))) {
      toInstall.push(pkg);
    }
  }

  if (toInstall.length === 0) {
    log("All apt packages already installed");
    return [];
  }

  log(`Installing apt packages: ${toInstall.join(" ")}`);
  await exec("apt-get", ["update", "-qq"]);
  const result = await exec("apt-get", ["install", "-y", "-qq", ...toInstall]);
  if (result.exitCode !== 0) {
    throw new Error(`apt-get install failed: ${result.stderr}`);
  }
  return toInstall;
}

/** Ensure a line exists in a file. Appends if not found. */
export async function ensureLineInFile(filePath: string, line: string): Promise<boolean> {
  let content = "";
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    // File doesn't exist yet — will create
  }

  if (content.includes(line)) {
    return false; // already present
  }

  const newContent =
    content.endsWith("\n") || content === "" ? content + line + "\n" : content + "\n" + line + "\n";
  await writeFile(filePath, newContent);
  return true;
}

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

/** Ensure a directory exists with the given permissions. */
export async function ensureDir(dir: string, mode: number = 0o755): Promise<void> {
  await mkdir(dir, { recursive: true, mode });
}

/** Download a URL to a file path. */
export async function downloadFile(url: string, dest: string): Promise<void> {
  const result = await exec("curl", ["-fsSL", url, "-o", dest]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to download ${url}: ${result.stderr}`);
  }
}

/** Download a URL and pipe to bash. */
export async function downloadAndRun(url: string, args: string[] = []): Promise<void> {
  // Download first, then execute — more reliable than piping
  const tmpScript = "/tmp/claw-installer.sh";
  await downloadFile(url, tmpScript);
  const result = await exec("bash", [tmpScript, ...args]);
  await exec("rm", ["-f", tmpScript]);
  if (result.exitCode !== 0) {
    throw new Error(`Installer script failed: ${result.stderr}`);
  }
}
