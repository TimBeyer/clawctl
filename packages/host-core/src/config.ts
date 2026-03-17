import { readFile } from "fs/promises";
import { resolveEnvRefs, validateConfig } from "@clawctl/types";
import type { InstanceConfig, VMConfig, CapabilityDef } from "@clawctl/types";
import { buildCapabilitiesSchema, getSecretPaths } from "./schema-derive.js";

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

/**
 * Strip secrets and one-time fields from config for persistence as clawctl.json.
 *
 * @param capabilities - When provided, also strips fields marked `secret: true`
 *   in each capability's configDef from the capabilities section.
 */
export function sanitizeConfig(
  config: InstanceConfig,
  capabilities?: CapabilityDef[],
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

  // provider.apiKey
  if (clone.provider && typeof clone.provider === "object") {
    delete (clone.provider as Record<string, unknown>).apiKey;
  }

  // network.gatewayToken
  if (clone.network && typeof clone.network === "object") {
    delete (clone.network as Record<string, unknown>).gatewayToken;
  }

  // telegram.botToken
  if (clone.telegram && typeof clone.telegram === "object") {
    delete (clone.telegram as Record<string, unknown>).botToken;
  }

  // Capability secrets (from configDef fields marked secret: true)
  if (capabilities && clone.capabilities && typeof clone.capabilities === "object") {
    const caps = clone.capabilities as Record<string, unknown>;
    for (const cap of capabilities) {
      if (!cap.configDef) continue;
      const capConfig = caps[cap.name];
      if (!capConfig || typeof capConfig !== "object") continue;
      const secretPaths = getSecretPaths(cap.configDef);
      for (const path of secretPaths) {
        // For simple paths (top-level keys), delete directly
        if (!path.startsWith("/")) {
          delete (capConfig as Record<string, unknown>)[path];
        } else {
          // For JSON Pointer paths, need to traverse
          const parts = path.slice(1).split("/");
          let target = capConfig as Record<string, unknown>;
          for (let i = 0; i < parts.length - 1; i++) {
            const next = target[parts[i]];
            if (!next || typeof next !== "object") break;
            target = next as Record<string, unknown>;
          }
          delete target[parts[parts.length - 1]];
        }
      }
    }
  }

  // bootstrap (one-time action)
  delete clone.bootstrap;

  return clone;
}

/**
 * Read and validate a JSON config file.
 *
 * @param capabilities - When provided, validates capability config sections
 *   against their configDef-derived Zod schemas.
 */
export async function loadConfig(
  path: string,
  capabilities?: CapabilityDef[],
): Promise<InstanceConfig> {
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

  const capabilitySchema = capabilities ? buildCapabilitiesSchema(capabilities) : undefined;
  return validateConfig(parsed, { capabilitySchema });
}
