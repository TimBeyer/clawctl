import { log, ok, fail } from "../../output.js";
import * as apt from "../../tools/apt.js";
import * as node from "../../tools/node.js";
import * as systemd from "../../tools/systemd.js";
import * as tailscale from "../../tools/tailscale.js";
import type { ProvisionResult } from "../../tools/types.js";

const APT_PACKAGES = ["build-essential", "git", "curl", "unzip", "jq", "ca-certificates", "gnupg"];

export async function runProvisionSystem(): Promise<void> {
  log("=== System Provisioning ===");

  const steps: ProvisionResult[] = [];

  log("--- APT packages ---");
  steps.push(await apt.ensure(APT_PACKAGES));

  log(`--- Node.js ---`);
  steps.push(await node.provision());

  log("--- systemd linger ---");
  steps.push(await systemd.provisionLinger());

  log("--- Tailscale ---");
  steps.push(await tailscale.provision());

  const failed = steps.filter((s) => s.status === "failed");
  if (failed.length > 0) {
    log("=== System provisioning failed ===");
    fail(
      failed.map((s) => `${s.name}: ${s.error}`),
      { steps },
    );
    process.exit(1);
  }

  log("=== System provisioning complete ===");
  ok({ steps });
}
