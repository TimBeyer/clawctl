import { mkdir } from "fs/promises";
import { join } from "path";
import type { VMConfig } from "../types.js";
import type { VMDriver, VMCreateOptions, OnLine } from "../drivers/types.js";
import {
  generateProvisionSystemScript,
  generateProvisionUserScript,
  generateHelpersScript,
  generateAptPackagesScript,
  generateNodejsScript,
  generateTailscaleScript,
  generateSystemdLingerScript,
  generateHomebrewScript,
  generateOpCliScript,
  generateShellProfileScript,
  generateOpenclawScript,
  generateGatewayServiceStubScript,
} from "../templates/index.js";
import { initGitRepo } from "./git.js";

export interface ProvisionCallbacks {
  onPhase?: (phase: string) => void;
  onStep?: (step: string) => void;
  onLine?: OnLine;
}

/**
 * Full VM provisioning sequence:
 * create dirs → generate scripts → create VM → run provisioning scripts.
 */
export async function provisionVM(
  driver: VMDriver,
  config: VMConfig,
  callbacks: ProvisionCallbacks = {},
  createOptions: VMCreateOptions = {},
): Promise<void> {
  const { onPhase, onStep, onLine } = callbacks;

  // Phase 1: Create project directory
  onPhase?.("project-setup");
  await mkdir(join(config.projectDir, "data", "state"), { recursive: true });
  onStep?.("Created project directory");

  // Phase 2: Generate scripts
  onPhase?.("generating");

  const scripts: Record<string, string> = {
    "helpers.sh": generateHelpersScript(),
    "provision-system.sh": generateProvisionSystemScript(),
    "provision-user.sh": generateProvisionUserScript(),
    "install-apt-packages.sh": generateAptPackagesScript(),
    "install-nodejs.sh": generateNodejsScript(),
    "enable-systemd-linger.sh": generateSystemdLingerScript(),
    "install-tailscale.sh": generateTailscaleScript(),
    "install-homebrew.sh": generateHomebrewScript(),
    "install-op-cli.sh": generateOpCliScript(),
    "setup-shell-profile.sh": generateShellProfileScript(),
    "install-openclaw.sh": generateOpenclawScript(),
    "setup-gateway-stub.sh": generateGatewayServiceStubScript(),
  };

  // Init git
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

  // Deploy provisioning scripts into VM as ephemeral temp files.
  // This mirrors the heredoc pattern used in bootstrap.ts for skill files.
  const vmScriptsDir = "/tmp/clawctl-provision";
  await driver.exec(config.vmName, `mkdir -p ${vmScriptsDir}`);
  for (const [name, content] of Object.entries(scripts)) {
    await driver.exec(
      config.vmName,
      `cat > ${vmScriptsDir}/${name} << 'CLAWCTL_SCRIPT'\n${content}\nCLAWCTL_SCRIPT`,
    );
  }
  onStep?.("Deployed provisioning scripts to VM");

  // Phase 4: Provision
  onPhase?.("provisioning");
  const systemResult = await driver.runScript(
    config.vmName,
    `${vmScriptsDir}/provision-system.sh`,
    true,
    onLine,
  );
  if (systemResult.exitCode !== 0) {
    throw new Error(
      `System provisioning failed (exit ${systemResult.exitCode}): ${systemResult.stderr}`,
    );
  }
  onStep?.("System packages installed");

  const userResult = await driver.runScript(
    config.vmName,
    `${vmScriptsDir}/provision-user.sh`,
    false,
    onLine,
  );
  if (userResult.exitCode !== 0) {
    throw new Error(`User provisioning failed (exit ${userResult.exitCode}): ${userResult.stderr}`);
  }
  onStep?.("User tools installed");

  // Clean up ephemeral scripts
  await driver.exec(config.vmName, `rm -rf ${vmScriptsDir}`);

  onPhase?.("done");
}
