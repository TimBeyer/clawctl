/**
 * VM health checks.
 *
 * Each check declares `availableAfter` — the lifecycle phase after which
 * it's expected to pass. The `--after <phase>` flag tells doctor how far
 * the lifecycle has progressed. Failures for phases not yet reached are
 * warnings; all others are errors. Without `--after`, all failures are
 * errors (strictest mode). See LIFECYCLE_PHASES in @clawctl/types.
 */

import { Command } from "commander";
import { commandExists } from "../exec.js";
import { log, ok, fail, setJsonMode } from "../output.js";
import { PROJECT_MOUNT_POINT, LIFECYCLE_PHASES, phaseReached } from "@clawctl/types";
import type { LifecyclePhase } from "@clawctl/types";
import { access } from "fs/promises";
import { constants } from "fs";
import * as systemd from "../tools/systemd.js";
import * as openclaw from "../tools/openclaw.js";

export interface DoctorCheck {
  name: string;
  passed: boolean;
  /** Lifecycle phase after which this check is expected to pass. */
  availableAfter: LifecyclePhase;
  /** Computed: true if the check failed but its phase hasn't been reached yet. */
  warn?: boolean;
  detail?: string;
  error?: string;
}

async function checkMount(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  // /mnt/project readable
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

  // /mnt/project/data writable
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

async function checkEnv(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  for (const varName of ["OPENCLAW_STATE_DIR", "OPENCLAW_CONFIG_PATH"]) {
    const value = process.env[varName];
    if (value) {
      checks.push({
        name: `env-${varName}`,
        passed: true,
        availableAfter: "provision-openclaw",
        detail: value,
      });
    } else {
      checks.push({
        name: `env-${varName}`,
        passed: false,
        availableAfter: "provision-openclaw",
        error: `${varName} not set`,
      });
    }
  }

  return checks;
}

async function checkPath(): Promise<DoctorCheck[]> {
  const toolPhases: Array<{ tool: string; availableAfter: LifecyclePhase }> = [
    { tool: "claw", availableAfter: "vm-created" },
    { tool: "node", availableAfter: "provision-system" },
    { tool: "op", availableAfter: "provision-tools" },
    { tool: "brew", availableAfter: "provision-tools" },
    { tool: "openclaw", availableAfter: "provision-openclaw" },
  ];
  const checks: DoctorCheck[] = [];

  for (const { tool, availableAfter } of toolPhases) {
    const exists = await commandExists(tool);
    if (exists) {
      checks.push({ name: `path-${tool}`, passed: true, availableAfter });
    } else {
      checks.push({
        name: `path-${tool}`,
        passed: false,
        availableAfter,
        error: `${tool} not found on PATH`,
      });
    }
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

      // Validate --after value if provided
      const afterPhase = opts.after as LifecyclePhase | undefined;
      if (afterPhase && !LIFECYCLE_PHASES.includes(afterPhase)) {
        fail([
          `Unknown lifecycle phase: ${afterPhase}. Valid phases: ${LIFECYCLE_PHASES.join(", ")}`,
        ]);
        process.exit(1);
      }

      log("=== claw doctor ===");

      const checks: DoctorCheck[] = [];

      log("Checking mounts...");
      checks.push(...(await checkMount()));

      log("Checking environment...");
      checks.push(...(await checkEnv()));

      log("Checking PATH...");
      checks.push(...(await checkPath()));

      log("Checking services...");
      checks.push(...(await checkService()));

      log("Checking OpenClaw...");
      checks.push(...(await checkOpenclaw()));

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
