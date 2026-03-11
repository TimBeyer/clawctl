/**
 * Post-onboard config patching: replace plaintext secrets with file provider SecretRefs.
 *
 * Two operations on known JSON paths:
 * 1. Patch main config — add file provider, replace telegram botToken with SecretRef
 * 2. Patch auth-profiles.json — replace token with tokenRef
 */
import type { VMDriver, OnLine } from "../drivers/types.js";
import type { ResolvedSecretRef } from "./secrets.js";
import { sanitizeKey } from "./secrets-sync.js";
import { PROJECT_MOUNT_POINT } from "../templates/constants.js";

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
  config: { telegram?: { botToken?: string } },
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

  // Replace telegram botToken with SecretRef if it was an op:// ref
  const telegramRef = resolvedMap.find((r) => r.path[0] === "telegram" && r.path[1] === "botToken");
  if (telegramRef && mainConfig.channels) {
    const channels = mainConfig.channels as Record<string, unknown>;
    if (channels.telegram) {
      const telegram = channels.telegram as Record<string, unknown>;
      telegram.botToken = makeSecretRef(telegramRef.path);
    }
  }

  await writeVMJson(driver, vmName, CONFIG_PATH, mainConfig);
  onLine?.("Main config patched");
}

/**
 * Patch auth-profiles.json to use tokenRef instead of plaintext token.
 *
 * Finds the profile matching `<providerType>:default` and replaces
 * `token` with `tokenRef` pointing to the file provider.
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
  const profiles = (authProfiles.profiles ?? {}) as Record<string, Record<string, unknown>>;
  const profileKey = `${providerType}:default`;
  const profile = profiles[profileKey];

  if (!profile) {
    onLine?.(`Profile "${profileKey}" not found — skipping auth-profiles patch`);
    return;
  }

  // Replace token with tokenRef
  delete profile.token;
  profile.tokenRef = makeSecretRef(apiKeyRef.path);

  await writeVMJson(driver, vmName, AUTH_PROFILES_PATH, authProfiles);
  onLine?.("auth-profiles.json patched");
}
