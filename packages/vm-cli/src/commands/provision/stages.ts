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
