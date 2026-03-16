import { readFile } from "fs/promises";
import { DAEMON_CONFIG_PATH } from "./paths.js";

export interface DaemonConfig {
  autoWatch?: boolean;
  instances?: string[];
  logLevel?: "debug" | "info" | "warn" | "error";
  tasks?: {
    checkpoint?: {
      disabled?: boolean;
      pollIntervalMs?: number;
    };
    healthMonitor?: {
      disabled?: boolean;
      intervalMs?: number;
      autoRestart?: boolean;
    };
  };
}

const DEFAULT_CONFIG: DaemonConfig = {
  autoWatch: true,
  logLevel: "info",
};

export async function loadDaemonConfig(path: string = DAEMON_CONFIG_PATH): Promise<DaemonConfig> {
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DaemonConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_CONFIG };
    }
    console.error(`Warning: could not read daemon config (${err}), using defaults`);
    return { ...DEFAULT_CONFIG };
  }
}
