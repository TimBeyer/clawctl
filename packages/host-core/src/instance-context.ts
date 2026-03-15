import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { homedir } from "os";
import { listInstances } from "./registry.js";
import { BIN_NAME } from "@clawctl/types";

const CONTEXT_FILENAME = ".clawctl";
const GLOBAL_CONFIG_DIR = join(homedir(), ".config", "clawctl");
const GLOBAL_CONTEXT_FILE = join(GLOBAL_CONFIG_DIR, "context.json");

export interface ContextFile {
  instance: string;
}

function parseContextFile(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Try JSON first
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed.instance === "string" && parsed.instance) {
        return parsed.instance;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  // Fall back to plain text (legacy)
  return trimmed;
}

function serializeContextFile(name: string): string {
  const data: ContextFile = { instance: name };
  return JSON.stringify(data, null, 2) + "\n";
}

export async function readContextFile(dir: string): Promise<string | undefined> {
  try {
    const content = await readFile(join(dir, CONTEXT_FILENAME), "utf-8");
    return parseContextFile(content);
  } catch {
    return undefined;
  }
}

export async function walkUpForContext(startDir: string): Promise<string | undefined> {
  let dir = startDir;
  for (;;) {
    const result = await readContextFile(dir);
    if (result) return result;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export async function readGlobalContext(): Promise<string | undefined> {
  try {
    const content = await readFile(GLOBAL_CONTEXT_FILE, "utf-8");
    return parseContextFile(content);
  } catch {
    return undefined;
  }
}

export async function writeLocalContext(name: string, dir?: string): Promise<void> {
  const target = dir ?? process.cwd();
  await writeFile(join(target, CONTEXT_FILENAME), serializeContextFile(name));
}

export async function writeGlobalContext(name: string): Promise<void> {
  await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
  await writeFile(GLOBAL_CONTEXT_FILE, serializeContextFile(name));
}

export interface ResolvedContext {
  name: string;
  source: "flag" | "env" | "local" | "global";
}

export async function resolveInstance(flag?: string, cwd?: string): Promise<ResolvedContext> {
  // 1. Explicit flag
  if (flag) {
    return { name: flag, source: "flag" };
  }

  // 2. Environment variable
  const envValue = process.env.CLAWCTL_INSTANCE;
  if (envValue) {
    return { name: envValue, source: "env" };
  }

  // 3. Walk up from cwd for .clawctl file
  const localName = await walkUpForContext(cwd ?? process.cwd());
  if (localName) {
    return { name: localName, source: "local" };
  }

  // 4. Global context file
  const globalName = await readGlobalContext();
  if (globalName) {
    return { name: globalName, source: "global" };
  }

  // Nothing found — error with helpful message
  const instances = await listInstances();
  const names = instances.map((i) => i.name);

  let msg = "No instance specified.\n";
  msg += `Specify one with: --instance <name>, CLAWCTL_INSTANCE env var, or '${BIN_NAME} use <name>'\n`;
  if (names.length > 0) {
    msg += `\nAvailable instances: ${names.join(", ")}`;
  } else {
    msg += `\nNo instances registered. Run '${BIN_NAME} create' first.`;
  }

  throw new Error(msg);
}
