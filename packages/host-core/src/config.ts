import { readFile } from "fs/promises";
import { resolveEnvRefs, validateConfig } from "@clawctl/types";
import type { InstanceConfig, VMConfig } from "@clawctl/types";

// Re-export validateConfig from types for convenience
export { validateConfig } from "@clawctl/types";

/** Convert InstanceConfig to VMConfig with defaults applied. */
export function configToVMConfig(config: InstanceConfig): VMConfig {
  const vm: VMConfig = {
    vmName: config.name,
    projectDir: config.project,
    cpus: config.resources?.cpus ?? 4,
    memory: config.resources?.memory ?? "8GiB",
    disk: config.resources?.disk ?? "50GiB",
  };
  if (config.mounts && config.mounts.length > 0) {
    vm.extraMounts = config.mounts;
  }
  return vm;
}

/** Strip secrets and one-time fields from config for persistence as clawctl.json. */
export function sanitizeConfig(config: InstanceConfig): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

  // provider.apiKey
  if (clone.provider && typeof clone.provider === "object") {
    delete (clone.provider as Record<string, unknown>).apiKey;
  }

  // network.gatewayToken, network.tailscale.authKey
  if (clone.network && typeof clone.network === "object") {
    const net = clone.network as Record<string, unknown>;
    delete net.gatewayToken;
    if (net.tailscale && typeof net.tailscale === "object") {
      delete (net.tailscale as Record<string, unknown>).authKey;
    }
  }

  // services.onePassword.serviceAccountToken
  if (clone.services && typeof clone.services === "object") {
    const svc = clone.services as Record<string, unknown>;
    if (svc.onePassword && typeof svc.onePassword === "object") {
      delete (svc.onePassword as Record<string, unknown>).serviceAccountToken;
    }
  }

  // telegram.botToken
  if (clone.telegram && typeof clone.telegram === "object") {
    delete (clone.telegram as Record<string, unknown>).botToken;
  }

  // bootstrap (one-time action)
  delete clone.bootstrap;

  return clone;
}

/** Read and validate a JSON config file. */
export async function loadConfig(path: string): Promise<InstanceConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (cause) {
    throw new Error(`Cannot read config file: ${path}`, { cause });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in config file: ${path}`);
  }

  // Resolve env:// references from host environment before validation
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    parsed = resolveEnvRefs(parsed as Record<string, unknown>);
  }

  return validateConfig(parsed);
}
