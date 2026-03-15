/**
 * Sync resolved infrastructure secrets to the VM and host.
 *
 * Infrastructure secrets (API keys, bot tokens) are resolved from op:// refs
 * on the host, then written to:
 * 1. VM: ~/.openclaw/secrets/infrastructure.json (off-mount, chmod 600)
 * 2. Host: <project>/.env.secrets (gitignored rebuild cache)
 */
import { writeFile } from "fs/promises";
import { join } from "path";
import type { VMDriver, OnLine } from "./drivers/types.js";
import type { ResolvedSecretRef } from "./secrets.js";

/**
 * Sanitize a config path into a flat JSON key for infrastructure.json.
 * e.g. ["provider", "apiKey"] → "provider_apikey"
 */
export function sanitizeKey(path: string[]): string {
  return path.join("_").toLowerCase();
}

/**
 * Build the infrastructure secrets JSON from resolved op:// refs.
 * Returns a flat object mapping sanitized keys to resolved values.
 */
export function buildInfraSecrets(resolvedMap: ResolvedSecretRef[]): Record<string, string> {
  const secrets: Record<string, string> = {};
  for (const entry of resolvedMap) {
    secrets[sanitizeKey(entry.path)] = entry.resolvedValue;
  }
  return secrets;
}

/**
 * Write infrastructure.json to the VM's secrets directory.
 * Creates ~/.openclaw/secrets/ (chmod 700) if it doesn't exist.
 */
export async function syncSecretsToVM(
  driver: VMDriver,
  vmName: string,
  resolvedMap: ResolvedSecretRef[],
  onLine?: OnLine,
): Promise<void> {
  const secrets = buildInfraSecrets(resolvedMap);
  const json = JSON.stringify(secrets, null, 2);

  onLine?.("Writing infrastructure secrets to VM...");
  await driver.exec(vmName, `mkdir -p ~/.openclaw/secrets && chmod 700 ~/.openclaw/secrets`);
  // Write via heredoc to avoid shell quoting issues with secret values
  await driver.exec(
    vmName,
    `cat > ~/.openclaw/secrets/infrastructure.json << 'SECRETS_EOF'\n${json}\nSECRETS_EOF`,
  );
  await driver.exec(vmName, `chmod 600 ~/.openclaw/secrets/infrastructure.json`);
  onLine?.("Infrastructure secrets written to VM");
}

/**
 * Write .env.secrets to the host project directory as a rebuild cache.
 * Format: KEY=value (one per line, no quoting — values are single-line secrets).
 */
export async function writeEnvSecrets(
  projectDir: string,
  resolvedMap: ResolvedSecretRef[],
  onLine?: OnLine,
): Promise<void> {
  const lines = resolvedMap.map(
    (entry) => `${sanitizeKey(entry.path).toUpperCase()}=${entry.resolvedValue}`,
  );
  const envPath = join(projectDir, ".env.secrets");
  await writeFile(envPath, lines.join("\n") + "\n", { mode: 0o600 });
  onLine?.(`Wrote ${envPath}`);
}
