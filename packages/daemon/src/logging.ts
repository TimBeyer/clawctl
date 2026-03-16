import { appendFile, stat, rename, mkdir } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { DAEMON_LOG_PATH, DAEMON_LOG_DIR } from "./paths.js";

const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB
const ROTATED_LOG_PATH = DAEMON_LOG_PATH + ".1";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export async function initLogging(): Promise<void> {
  await mkdir(DAEMON_LOG_DIR, { recursive: true });
}

export async function writeLog(
  level: LogLevel,
  msg: string,
  fields?: Record<string, unknown>,
): Promise<void> {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };

  await appendFile(DAEMON_LOG_PATH, JSON.stringify(entry) + "\n");
  await rotateIfNeeded();
}

async function rotateIfNeeded(): Promise<void> {
  try {
    const info = await stat(DAEMON_LOG_PATH);
    if (info.size > MAX_LOG_SIZE) {
      await rename(DAEMON_LOG_PATH, ROTATED_LOG_PATH);
    }
  } catch {
    // File doesn't exist or stat failed — skip
  }
}

export async function readLogLines(count: number): Promise<string[]> {
  const lines: string[] = [];
  try {
    const stream = createReadStream(DAEMON_LOG_PATH, { encoding: "utf-8" });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      lines.push(line);
    }
  } catch {
    // Log file doesn't exist
  }
  return lines.slice(-count);
}

export function formatLogLine(json: string): string {
  try {
    const entry = JSON.parse(json) as {
      ts: string;
      level: string;
      msg: string;
      task?: string;
      instance?: string;
    };
    const parts = [entry.ts.replace("T", " ").slice(0, 19)];
    parts.push(`[${entry.level.toUpperCase()}]`);
    if (entry.task) parts.push(`[${entry.task}]`);
    if (entry.instance) parts.push(`(${entry.instance})`);
    parts.push(entry.msg);
    return parts.join(" ");
  } catch {
    return json;
  }
}
