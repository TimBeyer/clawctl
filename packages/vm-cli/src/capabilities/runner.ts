/**
 * Capability-aware phase runner.
 *
 * Runs resolved hooks for a given phase:
 * - Takes pre-resolved hooks (caller does registry lookup)
 * - Runs migrations when installed version differs from declared version
 * - Tracks capability state after successful provisioning
 */

import type {
  CapabilityContext,
  CapabilityDef,
  CapabilityHook,
  ProvisionResult,
} from "@clawctl/types";
import { readCapabilityState, markInstalled, needsMigration, findMigrationPath } from "./state.js";

function formatResult(result: ProvisionResult): string {
  const detail = result.detail ? ` — ${result.detail}` : "";
  const error = result.error ? ` — ${result.error}` : "";
  return `${result.status}${detail}${error}`;
}

/**
 * Run all hooks for a given lifecycle phase.
 *
 * @param hooks - Pre-resolved hooks for this phase (from registry)
 * @param ctx - The capability context (SDK)
 * @param phaseName - Phase name for log messages
 * @param outputOk - Called on success with the results envelope
 * @param outputFail - Called on failure with errors and data
 */
export async function runPhase(
  hooks: Array<{
    capability: CapabilityDef;
    hook: CapabilityHook;
    timing: "pre" | "main" | "post";
  }>,
  ctx: CapabilityContext,
  phaseName: string,
  outputOk: (data: unknown) => void,
  outputFail: (errors: string[], data?: unknown) => void,
): Promise<void> {
  const state = await readCapabilityState(ctx);
  const results: ProvisionResult[] = [];

  // Count total steps for numbering
  const totalSteps = hooks.reduce((sum, h) => sum + h.hook.steps.length, 0);
  let stepNum = 0;

  ctx.log(`=== ${phaseName} provisioning ===`);

  for (const { capability, hook } of hooks) {
    // Check for migrations
    if (needsMigration(state, capability)) {
      const migrations = findMigrationPath(capability, state);
      if (migrations.length > 0) {
        ctx.log(
          `--- ${capability.label}: migrating from v${state.installed[capability.name].version} to v${capability.version} ---`,
        );
        for (const migration of migrations) {
          const result = await migration.run(ctx);
          results.push(result);
          const icon = result.status === "failed" ? "✗" : "✓";
          ctx.log(`      ${icon} ${formatResult(result)}`);
        }
        await markInstalled(ctx, state, capability.name, capability.version);
        stepNum += hook.steps.length; // Skip counting these steps
        continue;
      }
      // No migration path — fall through to re-provision (idempotent)
    }

    // Run provision steps
    for (const step of hook.steps) {
      stepNum++;
      ctx.log(`[${stepNum}/${totalSteps}] ${step.label}`);
      const result = await step.run(ctx);
      const icon = result.status === "failed" ? "✗" : "✓";
      ctx.log(`      ${icon} ${formatResult(result)}`);
      results.push(result);
    }

    // Track version for this capability
    const capResults = results.filter((r) => hook.steps.some((s) => s.name === r.name));
    const anyFailed = capResults.some((r) => r.status === "failed");
    if (!anyFailed) {
      await markInstalled(ctx, state, capability.name, capability.version);
    }
  }

  const failed = results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    ctx.log(`=== ${phaseName} provisioning failed ===`);
    outputFail(
      failed.map((r) => `${r.name}: ${r.error}`),
      { steps: results },
    );
    process.exit(1);
  }

  ctx.log(`=== ${phaseName} provisioning complete (${totalSteps} steps) ===`);
  outputOk({ steps: results });
}
