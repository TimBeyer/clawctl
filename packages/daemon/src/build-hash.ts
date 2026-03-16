import { createHash } from "crypto";
import { readFile, readdir } from "fs/promises";
import { resolve, join } from "path";

export function isDevMode(): boolean {
  const execPath = process.execPath;
  return execPath.endsWith("/bun") || execPath.endsWith("/bun.exe");
}

/**
 * Compute a hash that changes whenever the daemon code changes.
 *
 * - Compiled binary: hash the binary file itself.
 * - Dev mode (bun): hash all .ts files under packages/daemon/src/.
 *
 * This lets ensureDaemon() detect stale daemons in dev mode where
 * the package.json version never changes between edits.
 */
export async function computeBuildHash(): Promise<string> {
  if (!isDevMode()) {
    // Compiled binary — hash the binary itself
    const binary = await readFile(process.execPath);
    return createHash("sha256").update(binary).digest("hex").slice(0, 12);
  }

  // Dev mode — hash daemon package source files
  const srcDir = resolve(import.meta.dir);
  const hash = createHash("sha256");

  const files = await collectTsFiles(srcDir);
  files.sort(); // deterministic order

  for (const file of files) {
    const content = await readFile(file);
    hash.update(file.slice(srcDir.length)); // relative path as salt
    hash.update(content);
  }

  return hash.digest("hex").slice(0, 12);
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}
