import { Command } from "commander";
import { exec, commandExists } from "../exec.js";
import { log, ok, fail, setJsonMode } from "../output.js";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import { access } from "fs/promises";
import { constants } from "fs";

export interface DoctorCheck {
  name: string;
  passed: boolean;
  detail?: string;
  error?: string;
}

async function checkMount(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  // /mnt/project readable
  try {
    await access(PROJECT_MOUNT_POINT, constants.R_OK);
    checks.push({ name: "mount-project", passed: true, detail: `${PROJECT_MOUNT_POINT} readable` });
  } catch {
    checks.push({
      name: "mount-project",
      passed: false,
      error: `${PROJECT_MOUNT_POINT} not readable`,
    });
  }

  // /mnt/project/data writable
  try {
    await access(`${PROJECT_MOUNT_POINT}/data`, constants.W_OK);
    checks.push({
      name: "mount-data",
      passed: true,
      detail: `${PROJECT_MOUNT_POINT}/data writable`,
    });
  } catch {
    checks.push({
      name: "mount-data",
      passed: false,
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
      checks.push({ name: `env-${varName}`, passed: true, detail: value });
    } else {
      checks.push({ name: `env-${varName}`, passed: false, error: `${varName} not set` });
    }
  }

  return checks;
}

async function checkPath(): Promise<DoctorCheck[]> {
  const tools = ["claw", "op", "node", "bun", "brew", "openclaw"];
  const checks: DoctorCheck[] = [];

  for (const tool of tools) {
    const exists = await commandExists(tool);
    if (exists) {
      checks.push({ name: `path-${tool}`, passed: true });
    } else {
      checks.push({ name: `path-${tool}`, passed: false, error: `${tool} not found on PATH` });
    }
  }

  return checks;
}

async function checkService(): Promise<DoctorCheck[]> {
  const result = await exec("systemctl", ["--user", "is-active", "openclaw-gateway.service"]);
  const active = result.exitCode === 0 && result.stdout.trim() === "active";
  return [
    {
      name: "service-gateway",
      passed: active,
      detail: active ? "openclaw-gateway active" : undefined,
      error: active ? undefined : "openclaw-gateway not active",
    },
  ];
}

async function checkOpenclaw(): Promise<DoctorCheck[]> {
  if (!(await commandExists("openclaw"))) {
    return [{ name: "openclaw-doctor", passed: false, error: "openclaw not installed" }];
  }

  const result = await exec("openclaw", ["doctor"]);
  return [
    {
      name: "openclaw-doctor",
      passed: result.exitCode === 0,
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
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);

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

      const failed = checks.filter((c) => !c.passed);
      const passed = checks.filter((c) => c.passed);

      if (!opts.json) {
        for (const c of checks) {
          const icon = c.passed ? "[OK]" : "[FAIL]";
          const info = c.detail ?? c.error ?? "";
          log(`  ${icon} ${c.name}${info ? ` — ${info}` : ""}`);
        }
        log("");
        log(`${passed.length}/${checks.length} checks passed`);
      }

      if (failed.length > 0) {
        fail(
          failed.map((c) => `${c.name}: ${c.error}`),
          { checks },
        );
        if (!opts.json) process.exit(1);
      } else {
        ok({ checks });
      }
    });
}
