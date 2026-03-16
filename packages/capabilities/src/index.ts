// Individual capability definitions
export { systemBase } from "./capabilities/system-base/index.js";
export { homebrew } from "./capabilities/homebrew/index.js";
export { openclaw } from "./capabilities/openclaw/index.js";
export { checkpoint } from "./capabilities/checkpoint.js";
export { tailscale } from "./capabilities/tailscale.js";
export { onePassword } from "./capabilities/one-password/index.js";

// Runner (generic — takes resolved hooks)
export { runPhase } from "./runner.js";

// State
export {
  readCapabilityState,
  writeCapabilityState,
  markInstalled,
  needsMigration,
  findMigrationPath,
} from "./state.js";

// Utility (used by vm-cli registry)
export { basePhase, hookTiming } from "./util.js";
