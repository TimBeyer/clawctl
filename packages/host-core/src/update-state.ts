import { readFile, writeFile, mkdir, rename } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";

export interface UpdateState {
  lastCheckAt?: string;
  latestVersion?: string;
  latestReleaseUrl?: string;
  dismissedVersion?: string;
}

const DEFAULT_CONFIG_DIR = join(homedir(), ".config", "clawctl");
const STATE_FILE = "update-state.json";
const CHECK_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function statePath(configDir: string): string {
  return join(configDir, STATE_FILE);
}

export async function loadUpdateState(
  configDir: string = DEFAULT_CONFIG_DIR,
): Promise<UpdateState> {
  try {
    const raw = await readFile(statePath(configDir), "utf-8");
    return JSON.parse(raw) as UpdateState;
  } catch {
    return {};
  }
}

export async function saveUpdateState(
  state: UpdateState,
  configDir: string = DEFAULT_CONFIG_DIR,
): Promise<void> {
  await mkdir(configDir, { recursive: true });
  const path = statePath(configDir);
  const tmpPath = `${path}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmpPath, JSON.stringify(state, null, 2) + "\n");
  await rename(tmpPath, path);
}

export function isCheckStale(state: UpdateState): boolean {
  if (!state.lastCheckAt) return true;
  const elapsed = Date.now() - new Date(state.lastCheckAt).getTime();
  return elapsed > CHECK_TTL_MS;
}
