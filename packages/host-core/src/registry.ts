import { readFile, writeFile, mkdir, rename } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";

export interface RegistryEntry {
  name: string;
  projectDir: string;
  vmName: string;
  driver: string;
  createdAt: string;
  providerType?: string;
  gatewayPort: number;
  tailscaleUrl?: string;
}

export interface Registry {
  version: 1;
  instances: Record<string, RegistryEntry>;
}

const DEFAULT_CONFIG_DIR = join(homedir(), ".config", "clawctl");
const REGISTRY_FILE = "instances.json";

function registryPath(configDir: string): string {
  return join(configDir, REGISTRY_FILE);
}

function emptyRegistry(): Registry {
  return { version: 1, instances: {} };
}

export async function loadRegistry(configDir: string = DEFAULT_CONFIG_DIR): Promise<Registry> {
  try {
    const raw = await readFile(registryPath(configDir), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || typeof parsed.instances !== "object") {
      console.error("Warning: registry file has unexpected format, starting fresh");
      return emptyRegistry();
    }
    return parsed as Registry;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyRegistry();
    }
    console.error(`Warning: could not read registry (${err}), starting fresh`);
    return emptyRegistry();
  }
}

export async function saveRegistry(
  registry: Registry,
  configDir: string = DEFAULT_CONFIG_DIR,
): Promise<void> {
  await mkdir(configDir, { recursive: true });
  const path = registryPath(configDir);
  const tmpPath = `${path}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmpPath, JSON.stringify(registry, null, 2) + "\n");
  await rename(tmpPath, path);
}

export async function addInstance(
  entry: RegistryEntry,
  configDir: string = DEFAULT_CONFIG_DIR,
): Promise<void> {
  const registry = await loadRegistry(configDir);
  registry.instances[entry.name] = entry;
  await saveRegistry(registry, configDir);
}

export async function removeInstance(
  name: string,
  configDir: string = DEFAULT_CONFIG_DIR,
): Promise<boolean> {
  const registry = await loadRegistry(configDir);
  if (!(name in registry.instances)) return false;
  delete registry.instances[name];
  await saveRegistry(registry, configDir);
  return true;
}

export async function getInstance(
  name: string,
  configDir: string = DEFAULT_CONFIG_DIR,
): Promise<RegistryEntry | undefined> {
  const registry = await loadRegistry(configDir);
  return registry.instances[name];
}

export async function listInstances(
  configDir: string = DEFAULT_CONFIG_DIR,
): Promise<RegistryEntry[]> {
  const registry = await loadRegistry(configDir);
  return Object.values(registry.instances);
}
