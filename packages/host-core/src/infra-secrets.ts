/**
 * Post-onboard config patching: replace plaintext secrets with file provider SecretRefs.
 *
 * Two operations on known JSON paths:
 * 1. Patch main config — add file provider, replace channel secrets with SecretRefs
 * 2. Patch auth-profiles.json — converge active provider profile to the configured one
 */
import type { VMDriver, OnLine } from "./drivers/types.js";
import type { ResolvedSecretRef } from "./secrets.js";
import { sanitizeKey } from "./secrets-sync.js";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";

const SECRETS_PATH = "~/.openclaw/secrets/infrastructure.json";
const CONFIG_PATH = `${PROJECT_MOUNT_POINT}/data/config`;
const AUTH_PROFILES_PATH = `${PROJECT_MOUNT_POINT}/data/state/agents/main/agent/auth-profiles.json`;

interface SecretRefObject {
  source: "file";
  provider: "infra";
  id: string;
}

function makeSecretRef(path: string[]): SecretRefObject {
  return {
    source: "file",
    provider: "infra",
    id: `/${sanitizeKey(path)}`,
  };
}

/** Read a JSON file from the VM, returning the parsed object. */
async function readVMJson(
  driver: VMDriver,
  vmName: string,
  filePath: string,
): Promise<Record<string, unknown>> {
  const result = await driver.exec(vmName, `cat ${filePath}`);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to read ${filePath}: ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

/** Write a JSON object to a file in the VM. */
async function writeVMJson(
  driver: VMDriver,
  vmName: string,
  filePath: string,
  data: unknown,
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const result = await driver.exec(vmName, `cat > ${filePath} << 'JSON_EOF'\n${json}\nJSON_EOF`);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to write ${filePath}: ${result.stderr}`);
  }
}

/**
 * Patch the main openclaw config to use the file secret provider.
 *
 * - Adds secrets.providers.infra pointing to infrastructure.json
 * - If telegram botToken is present and was an op:// ref, replaces it with a SecretRef
 */
export async function patchMainConfig(
  driver: VMDriver,
  vmName: string,
  resolvedMap: ResolvedSecretRef[],
  config: {
    channels?: Record<string, Record<string, unknown>>;
  },
  onLine?: OnLine,
): Promise<void> {
  onLine?.("Patching main config with file provider...");
  const mainConfig = await readVMJson(driver, vmName, CONFIG_PATH);

  // Add file provider
  if (!mainConfig.secrets) mainConfig.secrets = {};
  const secrets = mainConfig.secrets as Record<string, unknown>;
  if (!secrets.providers) secrets.providers = {};
  const providers = secrets.providers as Record<string, unknown>;
  providers.infra = {
    source: "file",
    path: SECRETS_PATH,
    mode: "json",
  };

  // Replace channel secrets with SecretRefs if they were op:// refs.
  for (const ref of resolvedMap) {
    if (ref.path[0] !== "channels" || ref.path.length < 3) continue;
    const channelName = ref.path[1];
    const fieldName = ref.path[2];

    if (!mainConfig.channels) continue;
    const channels = mainConfig.channels as Record<string, unknown>;
    const channel = channels[channelName];
    if (!channel || typeof channel !== "object") continue;
    (channel as Record<string, unknown>)[fieldName] = makeSecretRef(ref.path);
  }

  await writeVMJson(driver, vmName, CONFIG_PATH, mainConfig);
  onLine?.("Main config patched");
}

/**
 * Pure transformation: converge an auth-profiles.json structure on the
 * configured provider.
 *
 * Behaviour:
 * - Adds (or refreshes) `<newProviderType>:default` with the file-provider
 *   tokenRef. Preserves any extra fields on an existing same-key profile.
 * - Removes other-provider `:default` profiles whose `provider` field is set
 *   and differs from `newProviderType` (so an anthropic→zai swap cleanly
 *   evicts the dead anthropic profile). Conservative: leaves profiles whose
 *   `provider` field is unset or whose key doesn't end in `:default`.
 * - Resets `lastGood` to point at the new provider only.
 * - Filters `usageStats` to keys still in `profiles`.
 *
 * Pure / no I/O — drives `patchAuthProfiles` and is unit-tested in isolation.
 */
export function applyAuthProfileSwap(
  authProfiles: Record<string, unknown>,
  newProviderType: string,
  apiKeyPath: string[],
): Record<string, unknown> {
  const result = structuredClone(authProfiles);
  const profiles = (result.profiles ?? (result.profiles = {})) as Record<
    string,
    Record<string, unknown>
  >;
  const newProfileKey = `${newProviderType}:default`;
  const newTokenRef = makeSecretRef(apiKeyPath);

  // Add or refresh the new provider's profile.
  const existing = profiles[newProfileKey];
  if (existing && typeof existing === "object") {
    // Same-key profile already there — preserve extra fields, but ensure
    // type/provider/tokenRef are canonical and any plaintext token is removed.
    const merged: Record<string, unknown> = { ...existing };
    delete merged.token;
    merged.type = "token";
    merged.provider = newProviderType;
    merged.tokenRef = newTokenRef;
    profiles[newProfileKey] = merged;
  } else {
    profiles[newProfileKey] = {
      type: "token",
      provider: newProviderType,
      tokenRef: newTokenRef,
    };
  }

  // Evict conflicting other-provider :default profiles.
  for (const [key, profile] of Object.entries(profiles)) {
    if (key === newProfileKey) continue;
    if (!key.endsWith(":default")) continue;
    if (!profile || typeof profile !== "object") continue;
    const provider = (profile as Record<string, unknown>).provider;
    if (typeof provider !== "string") continue;
    if (provider === newProviderType) continue;
    delete profiles[key];
  }

  // Reset lastGood to the converged profile only.
  result.lastGood = { [newProviderType]: newProfileKey };

  // Drop usageStats for profiles that no longer exist.
  if (result.usageStats && typeof result.usageStats === "object") {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(result.usageStats as Record<string, unknown>)) {
      if (key in profiles) filtered[key] = value;
    }
    result.usageStats = filtered;
  }

  return result;
}

/**
 * Patch auth-profiles.json to bind the configured provider's credentials.
 *
 * On first run (after `openclaw onboard`) this replaces the plaintext `token`
 * field with a `tokenRef` pointing at the file provider. On re-apply (e.g.
 * switching from one provider to another via a clawctl.json edit) it evicts
 * the prior provider's profile and adds the new one.
 *
 * Skips entirely when no `provider.apiKey` is in `resolvedMap` (e.g. inline
 * plaintext or no-key configurations).
 */
export async function patchAuthProfiles(
  driver: VMDriver,
  vmName: string,
  resolvedMap: ResolvedSecretRef[],
  providerType: string,
  onLine?: OnLine,
): Promise<void> {
  // Find the apiKey ref — it tells us the config path for the secret ID
  const apiKeyRef = resolvedMap.find((r) => r.path[0] === "provider" && r.path[1] === "apiKey");
  if (!apiKeyRef) {
    onLine?.("No provider.apiKey ref found — skipping auth-profiles patch");
    return;
  }

  onLine?.("Patching auth-profiles.json...");

  // Check if auth-profiles.json exists
  const checkResult = await driver.exec(vmName, `test -f ${AUTH_PROFILES_PATH}`);
  if (checkResult.exitCode !== 0) {
    onLine?.("auth-profiles.json not found — skipping");
    return;
  }

  const authProfiles = await readVMJson(driver, vmName, AUTH_PROFILES_PATH);
  const updated = applyAuthProfileSwap(authProfiles, providerType, apiKeyRef.path);

  await writeVMJson(driver, vmName, AUTH_PROFILES_PATH, updated);
  onLine?.("auth-profiles.json patched");
}
