import { Command } from "commander";
import { setJsonMode, ok, fail, log } from "../output.js";
import { createCapabilityContext } from "../capabilities/context.js";
import { getEnabledCapabilities } from "../capabilities/registry.js";
import { readCapabilityState, needsMigration, findMigrationPath, markInstalled } from "../capabilities/state.js";
import { readProvisionConfig } from "../tools/provision-config.js";
import type { ProvisionResult } from "@clawctl/types";

interface MigrateResult {
  migrated: string[];
  skipped: string[];
  failed: string[];
  results: ProvisionResult[];
}

async function runMigrate(): Promise<MigrateResult> {
  const config = await readProvisionConfig();
  const ctx = createCapabilityContext();
  const state = await readCapabilityState(ctx);
  const enabled = getEnabledCapabilities(config);

  const migrated: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  const results: ProvisionResult[] = [];

  for (const capability of enabled) {
    if (!needsMigration(state, capability)) {
      continue; // Already at current version or not installed
    }

    const migrations = findMigrationPath(capability, state);
    if (migrations.length === 0) {
      // Version bump with no migration chain — skip (binary update is enough)
      log(
        `${capability.label}: v${state.installed[capability.name]?.version} → v${capability.version} (no migration needed)`,
      );
      await markInstalled(ctx, state, capability.name, capability.version);
      skipped.push(capability.name);
      continue;
    }

    log(
      `${capability.label}: migrating v${state.installed[capability.name]?.version} → v${capability.version}`,
    );
    let anyFailed = false;

    for (const migration of migrations) {
      const result = await migration.run(ctx);
      results.push(result);
      const icon = result.status === "failed" ? "\u2717" : "\u2713";
      log(`  ${icon} ${result.name}: ${result.status}${result.detail ? ` — ${result.detail}` : ""}${result.error ? ` — ${result.error}` : ""}`);

      if (result.status === "failed") {
        anyFailed = true;
        failed.push(capability.name);
        break;
      }
    }

    if (!anyFailed) {
      await markInstalled(ctx, state, capability.name, capability.version);
      migrated.push(capability.name);
    }
  }

  return { migrated, skipped, failed, results };
}

export function registerMigrateCommand(program: Command): void {
  program
    .command("migrate")
    .description("Run capability migrations (used after claw binary update)")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);

      const result = await runMigrate();

      if (result.failed.length > 0) {
        fail(result.failed.map((name) => `${name}: migration failed`), result);
        process.exit(1);
      }

      log(
        `Migrations complete: ${result.migrated.length} migrated, ${result.skipped.length} skipped.`,
      );
      ok(result);
    });
}
