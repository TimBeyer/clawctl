/**
 * VM health checks.
 *
 * Core infrastructure checks (mounts, gateway service, openclaw doctor) are
 * defined here. Tool/path/env checks come from capabilities via the registry.
 */

import { Command } from "commander";
import { log, ok, fail, setJsonMode } from "../output.js";
import { PROJECT_MOUNT_POINT, LIFECYCLE_PHASES, phaseReached } from "@clawctl/types";
import type { LifecyclePhase } from "@clawctl/types";
import { access } from "fs/promises";
import { constants } from "fs";
import { getEnabledCapabilities, basePhase } from "../capabilities/registry.js";
import { createCapabilityContext } from "../capabilities/context.js";
import { readProvisionConfig } from "../tools/provision-config.js";
import * as systemd from "../tools/systemd.js";
import * as openclaw from "../tools/openclaw.js";

export interface DoctorCheck {
  name: string;
  passed: boolean;
  availableAfter: LifecyclePhase;
  warn?: boolean;
  detail?: string;
  error?: string;
}

async function checkMount(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  try {
    await access(PROJECT_MOUNT_POINT, constants.R_OK);
    checks.push({
      name: "mount-project",
      passed: true,
      availableAfter: "vm-created",
      detail: `${PROJECT_MOUNT_POINT} readable`,
    });
  } catch {
    checks.push({
      name: "mount-project",
      passed: false,
      availableAfter: "vm-created",
      error: `${PROJECT_MOUNT_POINT} not readable`,
    });
  }

  try {
    await access(`${PROJECT_MOUNT_POINT}/data`, constants.W_OK);
    checks.push({
      name: "mount-data",
      passed: true,
      availableAfter: "vm-created",
      detail: `${PROJECT_MOUNT_POINT}/data writable`,
    });
  } catch {
    checks.push({
      name: "mount-data",
      passed: false,
      availableAfter: "vm-created",
      error: `${PROJECT_MOUNT_POINT}/data not writable`,
    });
  }

  return checks;
}

async function checkService(): Promise<DoctorCheck[]> {
  const active = await systemd.isActive("openclaw-gateway.service");
  return [
    {
      name: "service-gateway",
      passed: active,
      availableAfter: "bootstrap",
      detail: active ? "openclaw-gateway active" : undefined,
      error: active ? undefined : "openclaw-gateway not active",
    },
  ];
}

async function checkOpenclaw(): Promise<DoctorCheck[]> {
  if (!(await openclaw.isInstalled())) {
    return [
      {
        name: "openclaw-doctor",
        passed: false,
        availableAfter: "bootstrap",
        error: "openclaw not installed",
      },
    ];
  }

  const result = await openclaw.doctor();
  return [
    {
      name: "openclaw-doctor",
      passed: result.exitCode === 0,
      availableAfter: "bootstrap",
      detail: result.exitCode === 0 ? result.stdout.trim() : undefined,
      error: result.exitCode !== 0 ? result.stderr.trim() || result.stdout.trim() : undefined,
    },
  ];
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Run health checks inside the VM")
    .option("--json", "Output structured JSON")
    .option("--after <phase>", "Lifecycle phase reached — checks for later phases become warnings")
    .action(async (opts: { json?: boolean; after?: string }) => {
      if (opts.json) setJsonMode(true);

      const afterPhase = opts.after as LifecyclePhase | undefined;
      if (afterPhase && !LIFECYCLE_PHASES.includes(afterPhase)) {
        fail([
          `Unknown lifecycle phase: ${afterPhase}. Valid phases: ${LIFECYCLE_PHASES.join(", ")}`,
        ]);
        process.exit(1);
      }

      log("=== claw doctor ===");

      const checks: DoctorCheck[] = [];

      // Core infrastructure checks
      log("Checking mounts...");
      checks.push(...(await checkMount()));

      log("Checking services...");
      checks.push(...(await checkService()));

      log("Checking OpenClaw...");
      checks.push(...(await checkOpenclaw()));

      // Capability-contributed checks
      log("Checking capabilities...");
      const config = await readProvisionConfig();
      const ctx = createCapabilityContext();
      const capabilities = getEnabledCapabilities(config);

      for (const cap of capabilities) {
        for (const [hookKey, hook] of Object.entries(cap.hooks)) {
          if (!hook?.doctorChecks) continue;
          const phase = basePhase(hookKey as Parameters<typeof basePhase>[0]);
          for (const check of hook.doctorChecks) {
            const result = await check.run(ctx);
            checks.push({
              name: check.name,
              passed: result.passed,
              availableAfter: check.availableAfter ?? phase,
              detail: result.detail,
              error: result.error,
            });
          }
        }
      }

      // Compute warn based on lifecycle phase
      for (const check of checks) {
        if (!check.passed) {
          check.warn = afterPhase ? !phaseReached(afterPhase, check.availableAfter) : false;
        }
      }

      const errors = checks.filter((c) => !c.passed && !c.warn);
      const warnings = checks.filter((c) => !c.passed && c.warn);
      const passed = checks.filter((c) => c.passed);

      if (!opts.json) {
        for (const c of checks) {
          const icon = c.passed ? "[OK]" : c.warn ? "[WARN]" : "[FAIL]";
          const info = c.detail ?? c.error ?? "";
          log(`  ${icon} ${c.name}${info ? ` — ${info}` : ""}`);
        }
        log("");
        log(`${passed.length}/${checks.length} checks passed`);
        if (warnings.length > 0) {
          log(
            `${warnings.length} warning(s) (expected before ${warnings
              .map((w) => w.availableAfter)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(", ")})`,
          );
        }
      }

      if (errors.length > 0) {
        fail(
          errors.map((c) => `${c.name}: ${c.error}`),
          { checks },
        );
        if (!opts.json) process.exit(1);
      } else {
        ok({ checks });
      }
    });
}
