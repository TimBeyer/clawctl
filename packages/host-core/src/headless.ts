import { writeFile } from "fs/promises";
import { join } from "path";
import { loadConfig, configToVMConfig, sanitizeConfig } from "./config.js";
import { checkPrereqs } from "./prereqs.js";
import { provisionVM } from "./provision.js";
import { verifyProvisioning } from "./verify.js";
import { findSecretRefs, hasOpRefs, resolveOpRefs, getNestedValue } from "./secrets.js";
import type { ResolvedSecretRef } from "./secrets.js";
import { syncSecretsToVM, writeEnvSecrets } from "./secrets-sync.js";
import { bootstrapOpenclaw } from "./bootstrap.js";
import { cleanupVM, onSignalCleanup } from "./cleanup.js";
import { getHostHooksForConfig, getCapabilityConfig } from "./capability-hooks.js";
import { GATEWAY_PORT } from "@clawctl/types";
import type { InstanceConfig } from "@clawctl/types";
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

export type HeadlessStage =
  | "prereqs"
  | "provision"
  | "verify"
  | "onepassword"
  | "secrets"
  | "tailscale"
  | "bootstrap"
  | "done";

export type StageStatus = "pending" | "running" | "done" | "error";

export interface HeadlessCallbacks {
  onStage?: (stage: HeadlessStage, status: StageStatus, detail?: string) => void;
  onStep?: (label: string) => void;
  onLine?: (prefix: string, message: string) => void;
  onError?: (stage: HeadlessStage, error: string) => void;
}

function defaultCallbacks(): Required<HeadlessCallbacks> {
  return {
    onStage: (stage, status, detail) => {
      if (status === "running") console.log(`[${stage}] ${detail ?? "Starting..."}`);
      else if (status === "done") console.log(`[${stage}] ${detail ?? "Done"}`);
    },
    onStep: (label) => console.log(`  ✓ ${label}`),
    onLine: (prefix, message) => console.log(`[${prefix}] ${message}`),
    onError: (stage, error) => console.log(`[${stage}] ✗ ${error}`),
  };
}

/** Run headless VM creation from a config file. */
export async function runHeadless(driver: VMDriver, configPath: string): Promise<HeadlessResult> {
  const cb = defaultCallbacks();
  cb.onLine("config", `Loading ${configPath}`);
  const config = await loadConfig(configPath);
  cb.onLine("config", `Instance: ${config.name} → ${config.project}`);
  return runHeadlessFromConfig(driver, config);
}

/** Run headless VM creation from an in-memory InstanceConfig. */
export async function runHeadlessFromConfig(
  driver: VMDriver,
  inputConfig: InstanceConfig,
  callbacks?: HeadlessCallbacks,
): Promise<HeadlessResult> {
  let config = inputConfig;
  const cb: Required<HeadlessCallbacks> = {
    ...defaultCallbacks(),
    ...callbacks,
  };

  // 1. Check prerequisites
  cb.onStage("prereqs", "running", "Checking host prerequisites...");
  const prereqs = await checkPrereqs(driver);

  if (!prereqs.isMacOS) throw new Error("macOS is required");
  if (!prereqs.isArm64) throw new Error("Apple Silicon (arm64) is required");
  if (!prereqs.hasHomebrew) throw new Error("Homebrew is required (https://brew.sh)");

  if (!prereqs.hasVMBackend) {
    cb.onLine("prereqs", "Lima not found, installing via Homebrew...");
    const version = await driver.install((line: string) => cb.onLine("brew", line));
    cb.onLine("prereqs", `Lima ${version} installed`);
  } else {
    cb.onLine("prereqs", `Lima ${prereqs.vmBackendVersion} found`);
  }
  cb.onStage("prereqs", "done", `Lima ${prereqs.vmBackendVersion ?? "installed"}`);

  const vmConfig = configToVMConfig(config);

  // Signal cleanup for steps 2–7
  const cleanupLog = (msg: string) => cb.onLine("cleanup", msg);
  const removeSignalHandlers = onSignalCleanup(
    driver,
    () => ({ vmName: vmConfig.vmName, projectDir: vmConfig.projectDir }),
    cleanupLog,
  );

  try {
    // 2. Provision VM
    cb.onStage("provision", "running", "Starting VM provisioning...");
    await provisionVM(
      driver,
      vmConfig,
      {
        onPhase: (phase: string) => cb.onLine("provision", `Phase: ${phase}`),
        onStep: (step: string) => cb.onStep(step),
        onLine: (line: string) => cb.onLine("vm", line),
      },
      {
        forwardGateway: config.network?.forwardGateway ?? true,
        gatewayPort: config.network?.gatewayPort,
        extraMounts: vmConfig.extraMounts,
      },
      undefined,
      config.capabilities,
    );
    cb.onStage("provision", "done", "VM provisioned");

    // 3. Verify provisioning
    cb.onStage("verify", "running", "Verifying installed tools...");
    const results = await verifyProvisioning(
      driver,
      vmConfig.vmName,
      undefined,
      "provision-openclaw",
    );
    const errors: string[] = [];
    for (const r of results) {
      if (r.passed) {
        cb.onStep(`${r.label}`);
      } else if (r.warn) {
        const reason = r.availableAfter ? `expected after ${r.availableAfter}` : "warning";
        cb.onLine("verify", `⚠ ${r.label}: ${r.error} (${reason})`);
      } else {
        cb.onError("verify", `${r.label}: ${r.error}`);
        errors.push(r.label);
      }
    }
    if (errors.length > 0) {
      cb.onStage("verify", "error", "Some tools failed to install");
      throw new Error("Some tools failed to install — check logs above");
    }
    cb.onStage("verify", "done", "All tools verified");

    // 4. Host-side capability setup hooks
    const hostHooks = getHostHooksForConfig(config);
    for (const hook of hostHooks) {
      cb.onStage(hook.stageName as HeadlessStage, "running", `${hook.stageLabel}...`);
      const capConfig = getCapabilityConfig(config, hook.capabilityName);
      const hookResult = await hook.run(capConfig, driver, vmConfig.vmName, (line: string) =>
        cb.onLine(hook.stageName, line),
      );
      if (hookResult.success) {
        cb.onStage(hook.stageName as HeadlessStage, "done", hookResult.detail);
      } else {
        cb.onStage(hook.stageName as HeadlessStage, "error", hookResult.error);
        cb.onError(
          hook.stageName as HeadlessStage,
          hookResult.error ?? `${hook.stageLabel} failed`,
        );
        throw new Error(`${hook.stageLabel} failed: ${hookResult.error}`);
      }
    }

    // 4.5. Resolve op:// secret references
    let resolvedMap: ResolvedSecretRef[] | undefined;
    if (hasOpRefs(config as unknown as Record<string, unknown>)) {
      cb.onStage("secrets", "running", "Resolving op:// secret references...");

      const opRefs = findSecretRefs(config as unknown as Record<string, unknown>).filter(
        (r) => r.scheme === "op",
      );

      const resolved = await resolveOpRefs(
        driver,
        vmConfig.vmName,
        config as unknown as Record<string, unknown>,
        (line: string) => cb.onLine("secrets", line),
      );

      resolvedMap = opRefs.map((ref) => ({
        ...ref,
        resolvedValue: getNestedValue(resolved, ref.path) as string,
      }));

      config = resolved as unknown as typeof config;
      cb.onStage("secrets", "done", "All references resolved");

      await syncSecretsToVM(driver, vmConfig.vmName, resolvedMap, (line: string) =>
        cb.onLine("secrets", line),
      );
      await writeEnvSecrets(config.project, resolvedMap, (line: string) =>
        cb.onLine("secrets", line),
      );
    }

    // 6. Bootstrap openclaw (if provider configured)
    const hostPort = config.network?.gatewayPort ?? GATEWAY_PORT;
    let gatewayToken: string | undefined;
    let dashboardUrl: string | undefined;
    let tailscaleUrl: string | undefined;

    if (config.provider) {
      cb.onStage("bootstrap", "running", "Running openclaw onboard...");
      const result = await bootstrapOpenclaw(
        driver,
        vmConfig.vmName,
        config,
        (line: string) => cb.onLine("bootstrap", line),
        resolvedMap,
      );
      gatewayToken = result.gatewayToken;
      dashboardUrl = result.dashboardUrl;
      tailscaleUrl = result.tailscaleUrl;
      if (!result.doctorPassed) {
        cb.onLine("bootstrap", "Warning: openclaw doctor reported issues");
      }
      cb.onStage("bootstrap", "done", "OpenClaw bootstrapped");
    } else {
      cb.onLine("done", `No provider configured — run '${BIN_NAME} oc onboard' when ready`);
    }

    cb.onStage("done", "done", `Instance "${config.name}" is ready`);

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
    cb.onLine("error", "Provisioning failed, cleaning up...");
    await cleanupVM(driver, vmConfig.vmName, vmConfig.projectDir, cleanupLog);
    throw err;
  } finally {
    removeSignalHandlers();
  }
}
