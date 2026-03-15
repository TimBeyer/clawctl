import { CLAW_BIN_PATH } from "@clawctl/types";
import type { VMDriver, OnLine } from "./drivers/types.js";

export interface VerifyResult {
  label: string;
  passed: boolean;
  error?: string;
}

interface DoctorCheck {
  name: string;
  passed: boolean;
  detail?: string;
  error?: string;
}

interface ClawDoctorOutput {
  status: "ok" | "error";
  data: { checks: DoctorCheck[] };
  errors: string[];
}

/** Verify VM health by delegating to `claw doctor --json`. */
export async function verifyProvisioning(
  driver: VMDriver,
  vmName: string,
  onLine?: OnLine,
): Promise<VerifyResult[]> {
  const result = await driver.exec(vmName, `${CLAW_BIN_PATH} doctor --json`, onLine);

  // If claw itself failed to run, return a single failed check
  if (result.exitCode !== 0 && !result.stdout.trim()) {
    return [
      {
        label: "claw doctor",
        passed: false,
        error: result.stderr || "claw doctor failed to run",
      },
    ];
  }

  try {
    const output: ClawDoctorOutput = JSON.parse(result.stdout);
    return output.data.checks.map((check) => ({
      label: check.name,
      passed: check.passed,
      error: check.error,
    }));
  } catch {
    return [
      {
        label: "claw doctor",
        passed: false,
        error: `Failed to parse claw doctor output: ${result.stdout.slice(0, 200)}`,
      },
    ];
  }
}
