import { writeFile } from "fs/promises";
import { join } from "path";
import { loadConfig, configToVMConfig, sanitizeConfig } from "./config.js";
import { checkPrereqs } from "./prereqs.js";
import { provisionVM } from "./provision.js";
import { verifyProvisioning } from "./verify.js";
import { setupOnePassword, setupTailscale } from "./credentials.js";
import { findSecretRefs, hasOpRefs, resolveOpRefs, getNestedValue } from "./secrets.js";
import type { ResolvedSecretRef } from "./secrets.js";
import { syncSecretsToVM, writeEnvSecrets } from "./secrets-sync.js";
import { bootstrapOpenclaw } from "./bootstrap.js";
import { cleanupVM, onSignalCleanup } from "./cleanup.js";
import { GATEWAY_PORT } from "@clawctl/types";
import { BIN_NAME } from "./bin-name.js";
import type { VMDriver } from "./drivers/types.js";

export interface HeadlessResult {
  name: string;
  projectDir: string;
  vmName: string;
  driver: string;
  providerType?: string;
  gatewayPort: number;
  gatewayToken?: string;
  dashboardUrl?: string;
  tailscaleUrl?: string;
}

function log(prefix: string, message: string) {
  console.log(`[${prefix}] ${message}`);
}

/** Run headless VM creation from a config file. */
export async function runHeadless(driver: VMDriver, configPath: string): Promise<HeadlessResult> {
  // 1. Load config
  log("config", `Loading ${configPath}`);
  let config = await loadConfig(configPath);
  const vmConfig = configToVMConfig(config);
  log("config", `Instance: ${config.name} → ${config.project}`);

  // 2. Check prerequisites
  log("prereqs", "Checking host prerequisites...");
  const prereqs = await checkPrereqs(driver);

  if (!prereqs.isMacOS) throw new Error("macOS is required");
  if (!prereqs.isArm64) throw new Error("Apple Silicon (arm64) is required");
  if (!prereqs.hasHomebrew) throw new Error("Homebrew is required (https://brew.sh)");

  if (!prereqs.hasVMBackend) {
    log("prereqs", "Lima not found, installing via Homebrew...");
    const version = await driver.install((line: string) => log("brew", line));
    log("prereqs", `Lima ${version} installed`);
  } else {
    log("prereqs", `Lima ${prereqs.vmBackendVersion} found`);
  }

  // Steps 3–7 create resources that need cleanup on failure.
  // Register signal handlers so Ctrl+C also triggers cleanup.
  const cleanupLog = (msg: string) => log("cleanup", msg);
  const removeSignalHandlers = onSignalCleanup(
    driver,
    () => ({ vmName: vmConfig.vmName, projectDir: vmConfig.projectDir }),
    cleanupLog,
  );

  try {
    // 3. Provision VM
    log("provision", "Starting VM provisioning...");
    await provisionVM(
      driver,
      vmConfig,
      {
        onPhase: (phase: string) => log("provision", `Phase: ${phase}`),
        onStep: (step: string) => log("provision", `✓ ${step}`),
        onLine: (line: string) => log("vm", line),
      },
      {
        forwardGateway: config.network?.forwardGateway ?? true,
        gatewayPort: config.network?.gatewayPort,
        extraMounts: vmConfig.extraMounts,
      },
    );

    // 4. Verify provisioning
    log("verify", "Verifying installed tools...");
    const results = await verifyProvisioning(driver, vmConfig.vmName);
    const errors: string[] = [];
    for (const r of results) {
      if (r.passed) {
        log("verify", `✓ ${r.label}`);
      } else if (r.warn) {
        log("verify", `⚠ ${r.label}: ${r.error} (warning, expected before bootstrap)`);
      } else {
        log("verify", `✗ ${r.label}: ${r.error}`);
        errors.push(r.label);
      }
    }
    if (errors.length > 0) {
      throw new Error("Some tools failed to install — check logs above");
    }

    // 5. Services: 1Password
    if (config.services?.onePassword) {
      log("1password", "Setting up 1Password...");
      const opResult = await setupOnePassword(
        driver,
        vmConfig.vmName,
        config.services.onePassword.serviceAccountToken,
        (line: string) => log("1password", line),
      );
      if (opResult.valid) {
        log("1password", `✓ Token validated (${opResult.account})`);
      } else {
        log("1password", `✗ ${opResult.error}`);
        throw new Error("1Password setup failed");
      }
    }

    // 5.5. Resolve op:// secret references in the VM
    let resolvedMap: ResolvedSecretRef[] | undefined;
    if (hasOpRefs(config as unknown as Record<string, unknown>)) {
      log("secrets", "Resolving op:// secret references...");

      // Capture original op:// refs before resolution
      const opRefs = findSecretRefs(config as unknown as Record<string, unknown>).filter(
        (r) => r.scheme === "op",
      );

      const resolved = await resolveOpRefs(
        driver,
        vmConfig.vmName,
        config as unknown as Record<string, unknown>,
        (line: string) => log("secrets", line),
      );

      // Build resolved map pairing each ref with its resolved value
      resolvedMap = opRefs.map((ref) => ({
        ...ref,
        resolvedValue: getNestedValue(resolved, ref.path) as string,
      }));

      config = resolved as unknown as typeof config;
      log("secrets", "All references resolved");

      // Sync infrastructure secrets to VM and host
      await syncSecretsToVM(driver, vmConfig.vmName, resolvedMap, (line: string) =>
        log("secrets", line),
      );
      await writeEnvSecrets(config.project, resolvedMap, (line: string) => log("secrets", line));
    }

    // 6. Network: Tailscale
    if (config.network?.tailscale) {
      log("tailscale", "Connecting to Tailscale...");
      const tsResult = await setupTailscale(
        driver,
        vmConfig.vmName,
        config.network.tailscale.authKey,
        (line: string) => log("tailscale", line),
      );
      if (tsResult.connected) {
        log("tailscale", `✓ Connected as ${tsResult.hostname}`);
      } else {
        log("tailscale", `✗ ${tsResult.error}`);
        throw new Error("Tailscale connection failed");
      }
    }

    // 7. Bootstrap openclaw (if provider configured)
    const hostPort = config.network?.gatewayPort ?? GATEWAY_PORT;
    let gatewayToken: string | undefined;
    let dashboardUrl: string | undefined;
    let tailscaleUrl: string | undefined;

    if (config.provider) {
      log("bootstrap", "Running openclaw onboard...");
      const result = await bootstrapOpenclaw(
        driver,
        vmConfig.vmName,
        config,
        (line: string) => log("bootstrap", line),
        resolvedMap,
      );
      gatewayToken = result.gatewayToken;
      dashboardUrl = result.dashboardUrl;
      tailscaleUrl = result.tailscaleUrl;
      log("bootstrap", `Gateway token: ${result.gatewayToken}`);
      if (!result.doctorPassed) {
        log("bootstrap", "Warning: openclaw doctor reported issues");
      }
      log("done", `Instance "${config.name}" is ready`);
      log("done", `Dashboard: ${result.dashboardUrl}/#token=${result.gatewayToken}`);
      if (tailscaleUrl) {
        log("done", `Tailscale: ${tailscaleUrl}`);
        log("done", "First tailnet connection requires device approval:");
        log("done", `  ${BIN_NAME} oc devices list`);
        log("done", `  ${BIN_NAME} oc devices approve <requestId>`);
      }
    } else {
      log("done", `Instance "${config.name}" is ready`);
      log("done", `Enter VM: ${BIN_NAME} shell`);
      log("done", `No provider configured — run '${BIN_NAME} oc onboard' when ready`);
    }

    // Write clawctl.json (sanitized config) to project dir
    const sanitized = sanitizeConfig(config);
    await writeFile(
      join(vmConfig.projectDir, "clawctl.json"),
      JSON.stringify(sanitized, null, 2) + "\n",
    );

    return {
      name: config.name,
      projectDir: vmConfig.projectDir,
      vmName: vmConfig.vmName,
      driver: driver.name,
      providerType: config.provider?.type,
      gatewayPort: hostPort,
      gatewayToken,
      dashboardUrl,
      tailscaleUrl,
    };
  } catch (err) {
    log("error", "Provisioning failed, cleaning up...");
    await cleanupVM(driver, vmConfig.vmName, vmConfig.projectDir, cleanupLog);
    throw err;
  } finally {
    removeSignalHandlers();
  }
}
