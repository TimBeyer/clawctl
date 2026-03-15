import { PROVIDERS } from "@clawctl/types";
import type { ProviderConfig } from "@clawctl/types";

/**
 * Build the `openclaw onboard --non-interactive` command string for a provider.
 *
 * Returns the full shell command with the API key passed via env var to avoid
 * shell escaping issues.
 */
export function buildOnboardCommand(provider: ProviderConfig, gatewayPort: number): string {
  const parts: string[] = [];

  if (provider.type === "custom") {
    // Custom provider: use --auth-choice custom-api-key with extra flags
    if (provider.apiKey) {
      parts.push(`CUSTOM_API_KEY="${provider.apiKey}"`);
    }
    parts.push(
      "openclaw onboard --non-interactive --accept-risk",
      "--mode local",
      "--auth-choice custom-api-key",
      "--secret-input-mode plaintext",
      `--gateway-port ${gatewayPort}`,
      "--gateway-bind loopback",
      "--install-daemon",
      "--daemon-runtime node",
      "--skip-skills",
    );
    if (provider.baseUrl) {
      parts.push(`--custom-base-url "${provider.baseUrl}"`);
    }
    if (provider.modelId) {
      parts.push(`--custom-model-id "${provider.modelId}"`);
    }
    if (provider.compatibility) {
      parts.push(`--custom-compatibility ${provider.compatibility}`);
    }
    if (provider.providerId) {
      parts.push(`--custom-provider-id "${provider.providerId}"`);
    }
  } else {
    // First-class provider: look up from registry
    const def = PROVIDERS[provider.type];
    if (!def) {
      throw new Error(`Unknown provider type: "${provider.type}"`);
    }

    parts.push(`${def.envVar}="${provider.apiKey}"`);
    parts.push(
      "openclaw onboard --non-interactive --accept-risk",
      "--mode local",
      `--auth-choice ${def.authChoice}`,
      "--secret-input-mode plaintext",
      `--gateway-port ${gatewayPort}`,
      "--gateway-bind loopback",
      "--install-daemon",
      "--daemon-runtime node",
      "--skip-skills",
    );
  }

  return parts.join(" ");
}
