// Bin name
export { BIN_NAME } from "./bin-name.js";

// Drivers
export { LimaDriver } from "./drivers/index.js";
export type { VMDriver, VMCreateOptions, ExecResult, OnLine } from "./drivers/types.js";

// Exec
export { exec, execStream, execWithLogs, commandExists } from "./exec.js";

// Config
export { loadConfig, validateConfig, configToVMConfig, sanitizeConfig } from "./config.js";

// Secrets (I/O + re-exports of pure functions from @clawctl/types)
export {
  resolveOpRefs,
  findSecretRefs,
  hasOpRefs,
  resolveEnvRefs,
  getNestedValue,
  setNestedValue,
} from "./secrets.js";
export type { SecretRef, ResolvedSecretRef } from "./secrets.js";

// Provision
export { provisionVM } from "./provision.js";
export type { ProvisionCallbacks, ProvisionFeatures } from "./provision.js";

// Claw binary (embedded asset in compiled mode, direct path in dev mode)
export { clawPath } from "./claw-binary.js";

// Verify
export { verifyProvisioning } from "./verify.js";
export type { VerifyResult } from "./verify.js";

// Providers
export { buildOnboardCommand } from "./providers.js";

// Bootstrap
export { bootstrapOpenclaw } from "./bootstrap.js";
export type { BootstrapResult } from "./bootstrap.js";

// Prerequisites
export { checkPrereqs } from "./prereqs.js";
export type { PrereqStatus } from "./prereqs.js";

// Credentials
export { setupOnePassword, setupTailscale } from "./credentials.js";
export type { OpResult, TailscaleResult } from "./credentials.js";

// Secrets sync
export {
  sanitizeKey,
  buildInfraSecrets,
  syncSecretsToVM,
  writeEnvSecrets,
} from "./secrets-sync.js";

// Infra secrets
export { patchMainConfig, patchAuthProfiles } from "./infra-secrets.js";

// Registry
export {
  loadRegistry,
  saveRegistry,
  addInstance,
  removeInstance,
  getInstance,
  listInstances,
} from "./registry.js";
export type { RegistryEntry, Registry } from "./registry.js";

// Instance context
export {
  readContextFile,
  walkUpForContext,
  readGlobalContext,
  writeLocalContext,
  writeGlobalContext,
  resolveInstance,
} from "./instance-context.js";
export type { ContextFile, ResolvedContext } from "./instance-context.js";

// Require instance
export { requireInstance } from "./require-instance.js";

// Git
export { initGitRepo } from "./git.js";

// Homebrew
export { isHomebrewInstalled, installFormula, isFormulaInstalled } from "./homebrew.js";

// Tailscale
export { getTailscaleHostname } from "./tailscale.js";

// Parse
export { extractGatewayToken, parseLimaVersion } from "./parse.js";

// Shell quote
export { shellQuote } from "./shell-quote.js";

// Redact
export { redact, redactSecrets } from "./redact.js";

// Cleanup
export { cleanupVM, onSignalCleanup } from "./cleanup.js";
export type { CleanupTarget } from "./cleanup.js";

// Headless
export { runHeadless, runHeadlessFromConfig } from "./headless.js";
export type { HeadlessResult, HeadlessCallbacks, HeadlessStage, StageStatus } from "./headless.js";
