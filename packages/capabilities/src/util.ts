/**
 * Hook key utility functions.
 *
 * Extracted from registry so they can be used by both the capabilities
 * package (runner) and the vm-cli registry.
 */

import type { PhaseHookKey, LifecyclePhase } from "@clawctl/types";

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
