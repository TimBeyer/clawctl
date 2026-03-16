import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { DAEMON_CONFIG_PATH } from "./paths.js";

export interface DaemonConfig {
  autoWatch?: boolean;
  instances?: string[];
  logLevel?: "debug" | "info" | "warn" | "error";
  tasks?: {
    checkpoint?: {
      enabled?: boolean;
      pollIntervalMs?: number;
    };
    healthMonitor?: {
      enabled?: boolean;
      intervalMs?: number;
      autoRestart?: boolean;
    };
  };
}

const DEFAULT_CONFIG: DaemonConfig = {
  autoWatch: true,
  logLevel: "info",
  tasks: {
    checkpoint: {
      enabled: true,
      pollIntervalMs: 2000,
    },
    healthMonitor: {
      enabled: true,
      intervalMs: 60000,
      autoRestart: false,
    },
  },
};

async function writeDefaultConfig(path: string): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  } catch {
    // Non-fatal — daemon works fine without the file
  }
}

export async function loadDaemonConfig(path: string = DAEMON_CONFIG_PATH): Promise<DaemonConfig> {
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DaemonConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await writeDefaultConfig(path);
      return { ...DEFAULT_CONFIG };
    }
    console.error(`Warning: could not read daemon config (${err}), using defaults`);
    return { ...DEFAULT_CONFIG };
  }
}
