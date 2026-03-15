import { readFile, writeFile, mkdir } from "fs/promises";

/** Ensure a line exists in a file. Appends if not found. Returns true if the line was added. */
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

/** Ensure a directory exists with the given permissions. */
export async function ensureDir(dir: string, mode: number = 0o755): Promise<void> {
  await mkdir(dir, { recursive: true, mode });
}
