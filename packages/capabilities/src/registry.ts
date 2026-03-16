/**
 * Static capability registry.
 *
 * Adding a new capability = write the module + add one import here.
 */

import type {
  CapabilityDef,
  CapabilityHook,
  ProvisionConfig,
  PhaseHookKey,
  LifecyclePhase,
} from "@clawctl/types";

// Core capabilities (always enabled)
import { systemBase } from "./capabilities/system-base.js";
import { homebrew } from "./capabilities/homebrew.js";
import { openclaw } from "./capabilities/openclaw.js";
import { checkpoint } from "./capabilities/checkpoint.js";

// Optional capabilities
import { tailscale } from "./capabilities/tailscale.js";
import { onePassword } from "./capabilities/one-password.js";

/** All known capabilities, in registration order. */
export const ALL_CAPABILITIES: CapabilityDef[] = [
  systemBase,
  homebrew,
  openclaw,
  checkpoint,
  tailscale,
  onePassword,
];

/** Check if a capability is enabled for the given config. */
export function isEnabled(capability: CapabilityDef, config: ProvisionConfig): boolean {
  if (capability.core) return true;
  if (capability.enabled) return capability.enabled(config);
  // Default for non-core: enabled only if listed in capabilities map
  return capability.name in (config.capabilities ?? {});
}

/** Get all enabled capabilities. */
export function getEnabledCapabilities(config: ProvisionConfig): CapabilityDef[] {
  return ALL_CAPABILITIES.filter((cap) => isEnabled(cap, config));
}

/** Extract the base phase from a hook key (strips pre:/post: prefix). */
export function basePhase(hookKey: PhaseHookKey): LifecyclePhase {
  if (hookKey.startsWith("pre:")) return hookKey.slice(4) as LifecyclePhase;
  if (hookKey.startsWith("post:")) return hookKey.slice(5) as LifecyclePhase;
  return hookKey as LifecyclePhase;
}

/** Extract timing from a hook key. */
export function hookTiming(hookKey: PhaseHookKey): "pre" | "main" | "post" {
  if (hookKey.startsWith("pre:")) return "pre";
  if (hookKey.startsWith("post:")) return "post";
  return "main";
}

/**
 * Get all hooks for a given lifecycle phase, across all enabled capabilities.
 * Returns them grouped by timing (pre, main, post), each group sorted by dependencies.
 */
export function getHooksForPhase(
  phase: LifecyclePhase,
  config: ProvisionConfig,
): Array<{ capability: CapabilityDef; hook: CapabilityHook; timing: "pre" | "main" | "post" }> {
  const enabled = getEnabledCapabilities(config);
  const results: Array<{
    capability: CapabilityDef;
    hook: CapabilityHook;
    timing: "pre" | "main" | "post";
  }> = [];

  for (const cap of enabled) {
    for (const [key, hook] of Object.entries(cap.hooks)) {
      const hookKey = key as PhaseHookKey;
      if (basePhase(hookKey) === phase && hook) {
        results.push({ capability: cap, hook, timing: hookTiming(hookKey) });
      }
    }
  }

  // Sort: pre first, then main, then post. Within each group, sort by dependencies.
  const timingOrder = { pre: 0, main: 1, post: 2 };
  const sorted = resolveOrder(results, enabled);
  sorted.sort((a, b) => timingOrder[a.timing] - timingOrder[b.timing]);
  return sorted;
}

/**
 * Topological sort of hooks based on capability dependencies.
 * Capabilities with dependencies come after their dependencies.
 */
function resolveOrder<T extends { capability: CapabilityDef }>(
  items: T[],
  allEnabled: CapabilityDef[],
): T[] {
  const enabledNames = new Set(allEnabled.map((c) => c.name));
  const result: T[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const itemsByName = new Map<string, T[]>();
  for (const item of items) {
    const existing = itemsByName.get(item.capability.name) ?? [];
    existing.push(item);
    itemsByName.set(item.capability.name, existing);
  }

  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    visiting.add(name);

    const cap = allEnabled.find((c) => c.name === name);
    if (cap?.dependsOn) {
      for (const dep of cap.dependsOn) {
        if (enabledNames.has(dep)) {
          visit(dep);
        }
      }
    }

    visiting.delete(name);
    visited.add(name);

    const capItems = itemsByName.get(name);
    if (capItems) {
      result.push(...capItems);
    }
  }

  for (const item of items) {
    visit(item.capability.name);
  }

  return result;
}

// Re-export all capability constants for direct access
export { systemBase } from "./capabilities/system-base.js";
export { homebrew } from "./capabilities/homebrew.js";
export { openclaw } from "./capabilities/openclaw.js";
export { checkpoint } from "./capabilities/checkpoint.js";
export { tailscale } from "./capabilities/tailscale.js";
export { onePassword } from "./capabilities/one-password.js";
