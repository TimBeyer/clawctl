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
 * Normalize config by bridging legacy paths and capabilities.
 *
 * - If `services.onePassword` exists but `capabilities["one-password"]` doesn't → create it
 * - If `network.tailscale` exists but `capabilities.tailscale` doesn't → create it
 * - If capabilities exist but legacy paths don't → populate legacy paths for backwards compat
 */
export function normalizeConfig(config: InstanceConfig): InstanceConfig {
  const result = { ...config };

  // Initialize capabilities map
  if (!result.capabilities) {
    result.capabilities = {};
  }

  // Legacy services.onePassword → capabilities["one-password"]
  if (result.services?.onePassword && !result.capabilities["one-password"]) {
    result.capabilities["one-password"] = {
      serviceAccountToken: result.services.onePassword.serviceAccountToken,
    };
  }
  // Reverse: capabilities["one-password"] → services.onePassword
  if (result.capabilities["one-password"] && !result.services?.onePassword) {
    const capConfig = result.capabilities["one-password"];
    if (typeof capConfig === "object" && "serviceAccountToken" in capConfig) {
      result.services = {
        ...result.services,
        onePassword: { serviceAccountToken: capConfig.serviceAccountToken as string },
      };
    }
  }

  // Legacy network.tailscale → capabilities.tailscale
  if (result.network?.tailscale && !result.capabilities.tailscale) {
    result.capabilities.tailscale = {
      authKey: result.network.tailscale.authKey,
      ...(result.network.tailscale.mode && { mode: result.network.tailscale.mode }),
    };
  }
  // Reverse: capabilities.tailscale → network.tailscale
  if (result.capabilities.tailscale && !result.network?.tailscale) {
    const capConfig = result.capabilities.tailscale;
    if (typeof capConfig === "object" && "authKey" in capConfig) {
      const mode =
        "mode" in capConfig && typeof capConfig.mode === "string"
          ? (capConfig.mode as "off" | "serve" | "funnel")
          : undefined;
      result.network = {
        ...result.network,
        tailscale: {
          authKey: capConfig.authKey as string,
          ...(mode && { mode }),
        },
      };
    }
  }

  return result;
}

/**
 * Read and validate a JSON config file.
 *
 * @param capabilities - When provided, validates capability config sections
 *   against their configDef-derived Zod schemas and normalizes legacy paths.
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
  let config = validateConfig(parsed, { capabilitySchema });

  if (capabilities) {
    config = normalizeConfig(config);
  }

  return config;
}
