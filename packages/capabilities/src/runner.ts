/**
 * Capability-aware phase runner.
 *
 * Replaces the old `runStage()` with capability-driven resolution:
 * - Collects hooks for the given phase from all enabled capabilities
 * - Resolves execution order by dependencies + pre/main/post timing
 * - Runs migrations when installed version differs from declared version
 * - Tracks capability state after successful provisioning
 * - Writes AGENTS.md managed section after the workspace phase
 */

import type {
  ProvisionConfig,
  ProvisionContext,
  ProvisionResult,
  LifecyclePhase,
} from "@clawctl/types";
import { getHooksForPhase, getEnabledCapabilities } from "./registry.js";
import { readCapabilityState, markInstalled, needsMigration, findMigrationPath } from "./state.js";
import { writeAgentsMd } from "./agents-md.js";

function formatResult(result: ProvisionResult): string {
  const detail = result.detail ? ` — ${result.detail}` : "";
  const error = result.error ? ` — ${result.error}` : "";
  return `${result.status}${detail}${error}`;
}

/**
 * Run all enabled capabilities for a given lifecycle phase.
 *
 * @param phase - The lifecycle phase to run (e.g. "provision-system")
 * @param config - The provision config (determines which capabilities are enabled)
 * @param ctx - The provision context (SDK)
 * @param outputOk - Called on success with the results envelope
 * @param outputFail - Called on failure with errors and data
 */
export async function runPhase(
  phase: LifecyclePhase,
  config: ProvisionConfig,
  ctx: ProvisionContext,
  outputOk: (data: unknown) => void,
  outputFail: (errors: string[], data?: unknown) => void,
): Promise<void> {
  const hooks = getHooksForPhase(phase, config);
  const state = await readCapabilityState(ctx);
  const results: ProvisionResult[] = [];

  // Count total steps for numbering
  const totalSteps = hooks.reduce((sum, h) => sum + h.hook.steps.length, 0);
  let stepNum = 0;

  ctx.log(`=== ${phase} provisioning ===`);

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

  // After workspace provisioning, write AGENTS.md
  if (phase === "provision-workspace") {
    const enabledCaps = getEnabledCapabilities(config);
    await writeAgentsMd(ctx, enabledCaps);
  }

  const failed = results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    ctx.log(`=== ${phase} provisioning failed ===`);
    outputFail(
      failed.map((r) => `${r.name}: ${r.error}`),
      { steps: results },
    );
    process.exit(1);
  }

  ctx.log(`=== ${phase} provisioning complete (${totalSteps} steps) ===`);
  outputOk({ steps: results });
}
