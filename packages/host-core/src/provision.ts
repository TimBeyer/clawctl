import { access, mkdir, writeFile } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import type { VMConfig, ProvisionConfig } from "@clawctl/types";
import { CLAW_BIN_PATH, PROVISION_CONFIG_FILE } from "@clawctl/types";
import type { VMDriver, VMCreateOptions, OnLine } from "./drivers/types.js";
import { initGitRepo } from "./git.js";
import { clawPath } from "./claw-binary.js";

export interface ProvisionCallbacks {
  onPhase?: (phase: string) => void;
  onStep?: (step: string) => void;
  onLine?: OnLine;
}

/**
 * Copy the claw binary from the host into the VM and install it on PATH.
 * Uses `driver.copy()` (limactl copy) to transfer the file, then moves
 * it to /usr/local/bin with sudo.
 */
export async function deployClaw(
  driver: VMDriver,
  vmName: string,
  clawBinaryPath: string,
  onLine?: OnLine,
): Promise<void> {
  try {
    await access(clawBinaryPath, constants.R_OK);
  } catch {
    throw new Error(`Claw binary not found at ${clawBinaryPath}. Run 'bun run build:claw' first.`);
  }

  await driver.copy(vmName, clawBinaryPath, "/tmp/claw");
  const result = await driver.exec(
    vmName,
    `sudo mv /tmp/claw ${CLAW_BIN_PATH} && sudo chmod +x ${CLAW_BIN_PATH}`,
    onLine,
  );
  if (result.exitCode !== 0) {
    throw new Error(`Failed to install claw binary: ${result.stderr}`);
  }
}

/**
 * Run a claw provision subcommand and parse its JSON output.
 */
export async function runClawProvision(
  driver: VMDriver,
  vmName: string,
  subcommand: string,
  asRoot: boolean,
  onLine?: OnLine,
): Promise<void> {
  const prefix = asRoot ? "sudo " : "";
  const result = await driver.exec(
    vmName,
    `${prefix}${CLAW_BIN_PATH} provision ${subcommand} --json`,
    onLine,
  );
  if (result.exitCode !== 0) {
    // Try to parse structured error from stdout
    let errorMsg = `claw provision ${subcommand} failed (exit ${result.exitCode})`;
    try {
      const output = JSON.parse(result.stdout);
      if (output.errors?.length) {
        errorMsg += `: ${output.errors.join("; ")}`;
      }
    } catch {
      if (result.stderr) {
        errorMsg += `: ${result.stderr}`;
      }
    }
    throw new Error(errorMsg);
  }
}

/**
 * Full VM provisioning sequence:
 * create dirs → init git → create VM → deploy claw → run claw provision commands.
 *
 * @param clawBinaryPath - Path to the compiled claw binary on the host.
 *   Defaults to `<repo>/dist/claw`. Build with `bun run build:claw`.
 */
export async function provisionVM(
  driver: VMDriver,
  config: VMConfig,
  callbacks: ProvisionCallbacks = {},
  createOptions: VMCreateOptions = {},
  clawBinaryPath: string = clawPath,
  capabilities: Record<string, true | Record<string, unknown>> = {},
): Promise<void> {
  const { onPhase, onStep, onLine } = callbacks;

  // Phase 1: Create project directory
  onPhase?.("project-setup");
  await mkdir(join(config.projectDir, "data", "state"), { recursive: true });
  onStep?.("Created project directory");

  // Write provision config so claw knows which optional capabilities to enable
  const provisionConfig: ProvisionConfig = { capabilities };
  await writeFile(
    join(config.projectDir, "data", PROVISION_CONFIG_FILE),
    JSON.stringify(provisionConfig, null, 2) + "\n",
  );
  onStep?.("Wrote provision config");

  // Phase 2: Init git
  onPhase?.("generating");
  await initGitRepo(config.projectDir);
  onStep?.("Initialized git repository");

  // Phase 3: Create VM (driver generates + writes lima.yaml internally)
  onPhase?.("creating-vm");

  const exists = await driver.exists(config.vmName);
  if (exists) {
    onLine?.(`VM "${config.vmName}" already exists, skipping creation`);
    const vmStatus = await driver.status(config.vmName);
    if (vmStatus === "Stopped") {
      onLine?.("VM is stopped, starting...");
      await driver.start(config.vmName);
      onLine?.("VM started");
    } else if (vmStatus !== "Running") {
      throw new Error(`VM "${config.vmName}" is in unexpected state: ${vmStatus}`);
    }
  } else {
    await driver.create(config, createOptions, onLine);
  }
  onStep?.("VM created and started");

  // Phase 4: Deploy claw binary
  onPhase?.("deploying");
  await deployClaw(driver, config.vmName, clawBinaryPath, onLine);
  onStep?.("Deployed claw binary to VM");

  // Phase 5: Provision via claw
  onPhase?.("provisioning");
  await runClawProvision(driver, config.vmName, "system", true, onLine);
  onStep?.("System packages installed");

  await runClawProvision(driver, config.vmName, "tools", false, onLine);
  onStep?.("User tools installed");

  await runClawProvision(driver, config.vmName, "openclaw", false, onLine);
  onStep?.("OpenClaw installed");

  await runClawProvision(driver, config.vmName, "workspace", false, onLine);
  onStep?.("Workspace configured");

  onPhase?.("done");
}
