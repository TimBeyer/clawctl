// Types and interfaces
export type { MountSpec, VMConfig, InstanceConfig } from "./types.js";

// Schemas
export {
  instanceConfigSchema,
  resourcesSchema,
  networkSchema,
  servicesSchema,
  agentSchema,
  toolsSchema,
  mountsSchema,
  providerSchema,
  bootstrapSchema,
  telegramSchema,
} from "./schemas/index.js";

// Constants
export { PROJECT_MOUNT_POINT, GATEWAY_PORT, CHECKPOINT_REQUEST_FILE, CLAW_BIN_PATH } from "./constants.js";

// Providers
export type { ProviderDef, ProviderConfig } from "./providers.js";
export { PROVIDERS, PROVIDER_TYPES, ALL_PROVIDER_TYPES } from "./providers.js";

// Config (pure functions)
export { validateConfig } from "./config.js";

// Secrets (pure functions)
export type { SecretRef, ResolvedSecretRef } from "./secrets.js";
export {
  findSecretRefs,
  hasOpRefs,
  resolveEnvRefs,
  getNestedValue,
  setNestedValue,
} from "./secrets.js";
