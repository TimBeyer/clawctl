import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { DAEMON_CONFIG_PATH } from "./paths.js";

export interface CheckpointTaskConfig {
  enabled?: boolean;
  pollIntervalMs?: number;
}

export interface HealthMonitorTaskConfig {
  enabled?: boolean;
  intervalMs?: number;
  autoRestart?: boolean;
}

export interface TasksConfig {
  checkpoint?: CheckpointTaskConfig;
  healthMonitor?: HealthMonitorTaskConfig;
}

export interface DaemonConfig {
  autoWatch?: boolean;
  instances?: string[];
  logLevel?: "debug" | "info" | "warn" | "error";
  tasks?: TasksConfig;
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
      intervalMs: 10000,
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

/**
 * Load per-instance task overrides from `<projectDir>/clawctl.json`.
 *
 * Looks for a `daemon` key with the same `TasksConfig` shape:
 * ```json
 * { "daemon": { "checkpoint": { ... }, "healthMonitor": { ... } } }
 * ```
 */
export async function loadInstanceTaskConfig(projectDir: string): Promise<TasksConfig | null> {
  try {
    const raw = await readFile(join(projectDir, "clawctl.json"), "utf-8");
    const parsed = JSON.parse(raw) as { daemon?: TasksConfig };
    return parsed.daemon ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve task config for a specific instance.
 * Priority: instance clawctl.json > daemon.json > defaults.
 */
export function resolveTaskConfig(
  global: DaemonConfig,
  instanceOverride: TasksConfig | null,
): TasksConfig {
  const base = global.tasks ?? {};
  if (!instanceOverride) return base;

  return {
    checkpoint: { ...base.checkpoint, ...instanceOverride.checkpoint },
    healthMonitor: { ...base.healthMonitor, ...instanceOverride.healthMonitor },
  };
}
