// Types and interfaces
export type { MountSpec, VMConfig, InstanceConfig } from "./types.js";

// Capability types (ProvisionConfig is now defined here)
export type {
  ExecContext,
  PhaseHookKey,
  ProvisionResult,
  ExecResult,
  ExecOptions,
  CapabilityContext,
  CapabilityStep,
  DoctorCheckDef,
  CapabilityHook,
  CapabilityMigration,
  CapabilityDef,
  CapabilityState,
  ProvisionConfig,
  ConfigFieldType,
  ConfigPath,
  JsonPointer,
  CapabilityConfigField,
  CapabilityConfigDef,
  HostSetupResult,
} from "./capability.js";
export { defineCapabilityConfig } from "./capability.js";

// Schemas
export {
  instanceConfigSchema,
  resourcesSchema,
  networkSchema,
  agentSchema,
  toolsSchema,
  capabilitiesSchema,
  mountsSchema,
  providerSchema,
  bootstrapSchema,
  telegramSchema,
  channelsSchema,
  openclawSchema,
} from "./schemas/index.js";

// Channels
export type { ChannelDef } from "./channels.js";
export { CHANNEL_REGISTRY, CHANNEL_ORDER, getChannelSecretPaths } from "./channels.js";

// Constants
export {
  PROJECT_MOUNT_POINT,
  GATEWAY_PORT,
  CHECKPOINT_REQUEST_FILE,
  PROVISION_CONFIG_FILE,
  CLAW_BIN_PATH,
  DEFAULT_PROJECT_BASE,
  LIFECYCLE_PHASES,
  phaseReached,
} from "./constants.js";
export type { LifecyclePhase } from "./constants.js";

// Providers
export type { ProviderDef, ProviderConfig } from "./providers.js";
export { PROVIDERS, PROVIDER_TYPES, ALL_PROVIDER_TYPES } from "./providers.js";

// Config (pure functions)
export type { ValidateConfigOptions } from "./config.js";
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
