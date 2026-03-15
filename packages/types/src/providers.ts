/**
 * Provider registry — single source of truth for mapping provider types
 * to `openclaw onboard --non-interactive` flags.
 */

export interface ProviderDef {
  /** Value for --auth-choice */
  authChoice: string;
  /** Environment variable name for the API key */
  envVar: string;
  /** CLI flag name for passing the key (e.g. "anthropic-api-key" → --anthropic-api-key) */
  keyFlag: string;
}

/**
 * First-class providers with dedicated --auth-choice support in
 * `openclaw onboard --non-interactive`.
 *
 * Source: docs.openclaw.ai/start/wizard-cli-automation
 */
export const PROVIDERS: Record<string, ProviderDef> = {
  anthropic: {
    authChoice: "apiKey",
    envVar: "ANTHROPIC_API_KEY",
    keyFlag: "anthropic-api-key",
  },
  openai: {
    authChoice: "openai-api-key",
    envVar: "OPENAI_API_KEY",
    keyFlag: "openai-api-key",
  },
  gemini: {
    authChoice: "gemini-api-key",
    envVar: "GEMINI_API_KEY",
    keyFlag: "gemini-api-key",
  },
  zai: {
    authChoice: "zai-api-key",
    envVar: "ZAI_API_KEY",
    keyFlag: "zai-api-key",
  },
  mistral: {
    authChoice: "mistral-api-key",
    envVar: "MISTRAL_API_KEY",
    keyFlag: "mistral-api-key",
  },
  moonshot: {
    authChoice: "moonshot-api-key",
    envVar: "MOONSHOT_API_KEY",
    keyFlag: "moonshot-api-key",
  },
  synthetic: {
    authChoice: "synthetic-api-key",
    envVar: "SYNTHETIC_API_KEY",
    keyFlag: "synthetic-api-key",
  },
  "opencode-zen": {
    authChoice: "opencode-zen",
    envVar: "OPENCODE_API_KEY",
    keyFlag: "opencode-zen-api-key",
  },
  "ai-gateway": {
    authChoice: "ai-gateway-api-key",
    envVar: "AI_GATEWAY_API_KEY",
    keyFlag: "ai-gateway-api-key",
  },
  kilocode: {
    authChoice: "kilocode-api-key",
    envVar: "KILOCODE_API_KEY",
    keyFlag: "kilocode-api-key",
  },
  volcengine: {
    authChoice: "volcengine-api-key",
    envVar: "VOLCANO_ENGINE_API_KEY",
    keyFlag: "volcengine-api-key",
  },
  byteplus: {
    authChoice: "byteplus-api-key",
    envVar: "BYTEPLUS_API_KEY",
    keyFlag: "byteplus-api-key",
  },
  minimax: {
    authChoice: "minimax-api",
    envVar: "MINIMAX_API_KEY",
    keyFlag: "minimax-api-key",
  },
  huggingface: {
    authChoice: "huggingface-api-key",
    envVar: "HUGGINGFACE_HUB_TOKEN",
    keyFlag: "huggingface-api-key",
  },
};

/** All valid first-class provider type names. */
export const PROVIDER_TYPES = Object.keys(PROVIDERS);

/** Provider types that the user can specify (first-class + "custom"). */
export const ALL_PROVIDER_TYPES = [...PROVIDER_TYPES, "custom"];

export interface ProviderConfig {
  type: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  modelId?: string;
  compatibility?: string;
  providerId?: string;
}
