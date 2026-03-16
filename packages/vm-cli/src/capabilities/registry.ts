/**
 * Static capability registry — application wiring.
 *
 * Lives in vm-cli because the "which capabilities exist and which are enabled"
 * question is application policy, not part of the extension interface.
 *
 * Adding a new capability = write the module in @clawctl/capabilities + add
 * one import here.
 */

import type {
  CapabilityDef,
  CapabilityHook,
  ProvisionConfig,
  PhaseHookKey,
  LifecyclePhase,
} from "@clawctl/types";
import {
  systemBase,
  homebrew,
  openclaw,
  checkpoint,
  tailscale,
  onePassword,
} from "@clawctl/capabilities";
import { basePhase, hookTiming } from "./util.js";

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

// Re-export utility functions for convenience
export { basePhase, hookTiming } from "./util.js";
