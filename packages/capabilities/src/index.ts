import type { CapabilityDef } from "@clawctl/types";

// Individual capability definitions
export { systemBase } from "./capabilities/system-base/index.js";
export { homebrew } from "./capabilities/homebrew/index.js";
export { openclaw } from "./capabilities/openclaw/index.js";
export { checkpoint } from "./capabilities/checkpoint.js";
export { tailscale } from "./capabilities/tailscale.js";
export { onePassword } from "./capabilities/one-password/index.js";

// Re-import for the list (tree-shaking preserves individual exports)
import { systemBase } from "./capabilities/system-base/index.js";
import { homebrew } from "./capabilities/homebrew/index.js";
import { openclaw } from "./capabilities/openclaw/index.js";
import { checkpoint } from "./capabilities/checkpoint.js";
import { tailscale } from "./capabilities/tailscale.js";
import { onePassword } from "./capabilities/one-password/index.js";

/** All registered capabilities, in dependency order. */
export const ALL_CAPABILITIES: CapabilityDef[] = [
  systemBase,
  homebrew,
  openclaw,
  checkpoint,
  tailscale,
  onePassword,
];
