/**
 * Provisioning stage runner.
 *
 * Each provisioning stage (system, tools, openclaw) is a declarative
 * ProvisionStage constant — a named list of steps with `run` functions.
 * `runStage()` handles the shared boilerplate: numbered logging, result
 * collection, failure detection, and ok/fail JSON output.
 *
 * To add a step, add an entry to the relevant stage's `steps` array.
 * To add a new stage, create a new ProvisionStage constant and wire it
 * into provision/index.ts.
 *
 * The `phase` field ties the stage to the VM lifecycle (see
 * LIFECYCLE_PHASES in @clawctl/types). Doctor checks reference these
 * phases via `availableAfter` to classify failures as warnings or errors
 * depending on how far provisioning has progressed.
 */

import type { LifecyclePhase } from "@clawctl/types";
import { log, ok, fail } from "../../output.js";
import type { ProvisionResult } from "../../tools/types.js";

export interface ProvisionStep {
  name: string;
  label: string;
  run: () => Promise<ProvisionResult>;
}

export interface ProvisionStage {
  name: string;
  phase: LifecyclePhase;
  steps: ProvisionStep[];
}

function formatResult(result: ProvisionResult): string {
  const detail = result.detail ? ` — ${result.detail}` : "";
  const error = result.error ? ` — ${result.error}` : "";
  return `${result.status}${detail}${error}`;
}

/** Run all steps in a stage with numbered logging, then emit ok/fail. */
export async function runStage(stage: ProvisionStage): Promise<void> {
  const total = stage.steps.length;
  log(`=== ${stage.name} provisioning ===`);

  const results: ProvisionResult[] = [];

  for (let i = 0; i < total; i++) {
    const step = stage.steps[i];
    log(`[${i + 1}/${total}] ${step.label}`);
    const result = await step.run();
    const icon = result.status === "failed" ? "✗" : "✓";
    log(`      ${icon} ${formatResult(result)}`);
    results.push(result);
  }

  const failed = results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    log(`=== ${stage.name} provisioning failed ===`);
    fail(
      failed.map((r) => `${r.name}: ${r.error}`),
      { steps: results },
    );
    process.exit(1);
  }

  log(`=== ${stage.name} provisioning complete (${total} steps) ===`);
  ok({ steps: results });
}
