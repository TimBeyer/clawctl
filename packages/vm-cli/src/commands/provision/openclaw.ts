import { log, ok, fail } from "../../output.js";
import * as openclaw from "../../tools/openclaw.js";
import type { ProvisionResult } from "../../tools/types.js";

export async function runProvisionOpenclaw(): Promise<void> {
  log("=== OpenClaw Provisioning ===");

  const steps: ProvisionResult[] = [];

  log("--- OpenClaw ---");
  steps.push(await openclaw.provision());

  log("--- Environment variables ---");
  steps.push(await openclaw.provisionEnvVars());

  log("--- npm-global PATH ---");
  steps.push(await openclaw.provisionNpmGlobalPath());

  log("--- Gateway service stub ---");
  steps.push(await openclaw.provisionGatewayStub());

  const failed = steps.filter((s) => s.status === "failed");
  if (failed.length > 0) {
    log("=== OpenClaw provisioning failed ===");
    fail(
      failed.map((s) => `${s.name}: ${s.error}`),
      { steps },
    );
    process.exit(1);
  }

  log("=== OpenClaw provisioning complete ===");
  ok({ steps });
}
