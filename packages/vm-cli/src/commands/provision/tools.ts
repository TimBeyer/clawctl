import { log, ok, fail } from "../../output.js";
import * as homebrew from "../../tools/homebrew.js";
import * as opCli from "../../tools/op-cli.js";
import { ensurePath } from "../../tools/shell-profile.js";
import type { ProvisionResult } from "../../tools/types.js";

export async function runProvisionTools(): Promise<void> {
  log("=== User Tools Provisioning ===");

  const steps: ProvisionResult[] = [];

  log("--- Homebrew ---");
  steps.push(await homebrew.provision());

  log("--- 1Password CLI ---");
  steps.push(await opCli.provision());

  log("--- Shell profile ---");
  try {
    await ensurePath("$HOME/.local/bin");
    log("Shell profile configured");
    steps.push({ name: "shell-profile", status: "installed" });
  } catch (err) {
    steps.push({ name: "shell-profile", status: "failed", error: String(err) });
  }

  const failed = steps.filter((s) => s.status === "failed");
  if (failed.length > 0) {
    log("=== User tools provisioning failed ===");
    fail(
      failed.map((s) => `${s.name}: ${s.error}`),
      { steps },
    );
    process.exit(1);
  }

  log("=== User tools provisioning complete ===");
  ok({ steps });
}
