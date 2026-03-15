// Types and interfaces
export type {
  MountSpec,
  VMConfig,
  PrereqStatus,
  ProvisioningStep,
  CredentialConfig,
  WizardStep,
  InstanceConfig,
} from "./types.js";

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
export { UBUNTU_IMAGE_URL, PROJECT_MOUNT_POINT, GATEWAY_PORT } from "./constants.js";

// Bin name
export { BIN_NAME } from "./bin-name.js";

// Providers
export type { ProviderDef, ProviderConfig } from "./providers.js";
export {
  PROVIDERS,
  PROVIDER_TYPES,
  ALL_PROVIDER_TYPES,
  buildOnboardCommand,
} from "./providers.js";

// Config (pure functions)
export {
  validateConfig,
  configToVMConfig,
  sanitizeConfig,
  formatZodError,
  expandTilde,
} from "./config.js";

// Secrets (pure functions)
export type { SecretRef, ResolvedSecretRef } from "./secrets.js";
export {
  findSecretRefs,
  hasOpRefs,
  resolveEnvRefs,
  getNestedValue,
  setNestedValue,
} from "./secrets.js";
