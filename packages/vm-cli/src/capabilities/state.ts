/**
 * Capability state tracking.
 *
 * Reads/writes data/capability-state.json in the project mount.
 * Tracks installed capability versions for migration detection.
 */

import { join } from "path";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import type {
  CapabilityState,
  CapabilityDef,
  CapabilityMigration,
  CapabilityContext,
} from "@clawctl/types";

const STATE_PATH = join(PROJECT_MOUNT_POINT, "data", "capability-state.json");

const EMPTY_STATE: CapabilityState = { installed: {} };

/** Read the capability state file. Returns empty state if missing/malformed. */
export async function readCapabilityState(ctx: CapabilityContext): Promise<CapabilityState> {
  try {
    const raw = await ctx.fs.readFile(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.installed) {
      return parsed as CapabilityState;
    }
    return EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

/** Write the capability state file. */
export async function writeCapabilityState(
  ctx: CapabilityContext,
  state: CapabilityState,
): Promise<void> {
  await ctx.fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

/** Mark a capability as installed with the given version. */
export async function markInstalled(
  ctx: CapabilityContext,
  state: CapabilityState,
  name: string,
  version: string,
): Promise<void> {
  state.installed[name] = { version, installedAt: new Date().toISOString() };
  await writeCapabilityState(ctx, state);
}

/** Check if a capability needs migration (installed version differs from declared). */
export function needsMigration(state: CapabilityState, capability: CapabilityDef): boolean {
  const installed = state.installed[capability.name];
  if (!installed) return false; // Not installed yet — provision, don't migrate
  return installed.version !== capability.version;
}

/**
 * Find the migration path from installed version to current version.
 *
 * Returns an ordered array of migrations to apply, or an empty array if
 * no migration path exists (no migrations declared, or a gap in the chain).
 * See docs/capabilities.md "Versioning and migrations" for how callers
 * handle the empty case.
 */
export function findMigrationPath(
  capability: CapabilityDef,
  state: CapabilityState,
): CapabilityMigration[] {
  const installed = state.installed[capability.name];
  if (!installed || !capability.migrations?.length) return [];

  const target = capability.version;
  let current = installed.version;
  const path: CapabilityMigration[] = [];

  // Walk the migration chain
  while (current !== target) {
    const next = capability.migrations.find((m) => m.from === current);
    if (!next) {
      // No migration from current version — gap in the chain.
      return [];
    }
    path.push(next);
    current = next.to;
  }

  return path;
}
