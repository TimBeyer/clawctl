import { openSync } from "node:fs";
import { ReadStream } from "node:tty";
import type { VMDriver } from "@clawctl/host-core";
import {
  addInstance,
  loadConfig,
  runHeadless,
  configToVMConfig,
  cleanupVM,
  BIN_NAME,
} from "@clawctl/host-core";
import type { RegistryEntry, HeadlessResult } from "@clawctl/host-core";
import type { InstanceConfig } from "@clawctl/types";

/**
 * Run the plain (CI-friendly) create path: load config, provision with
 * streaming log output, register. No TUI.
 */
export async function runCreatePlain(driver: VMDriver, configPath: string): Promise<void> {
  const result = await runHeadless(driver, configPath);
  await registerInstance(result, driver.name);
}

/**
 * Run config-driven create with the TUI provision monitor.
 * Loads the config from disk, then renders ProvisionApp for the visual
 * progress view (stages, steps, logs).
 */
export async function runCreateFromConfig(driver: VMDriver, configPath: string): Promise<void> {
  const config = await loadConfig(configPath);

  const React = (await import("react")).default;
  const { render } = await import("ink");
  const { ProvisionApp } = await import("../app.js");

  let inkStdin: ReadStream | undefined;
  try {
    inkStdin = new ReadStream(openSync("/dev/tty", "r"));
  } catch {
    // /dev/tty unavailable — Ink will use process.stdin
  }

  const useAltScreen = process.stdout.isTTY;
  if (useAltScreen) {
    process.stdout.write("\x1b[?1049h");
  }

  const renderOpts = inkStdin ? { stdin: inkStdin } : undefined;
  const instance = render(React.createElement(ProvisionApp, { driver, config }), renderOpts);

  let exitResult: unknown;
  try {
    exitResult = await instance.waitUntilExit();
  } finally {
    if (useAltScreen) {
      process.stdout.write("\x1b[?1049l");
    }
    inkStdin?.destroy();
  }

  if (
    exitResult &&
    typeof exitResult === "object" &&
    "action" in exitResult &&
    (exitResult as { action: string }).action === "created"
  ) {
    const { result } = exitResult as { action: string; result: HeadlessResult };
    await registerInstance(result, driver.name);
    printSummary(result);
  } else {
    // Ctrl-C or error — clean up VM and project dir
    const vmConfig = configToVMConfig(config);
    await cleanupVM(driver, vmConfig.vmName, vmConfig.projectDir);
    process.exit(130);
  }
}

/**
 * Run the interactive TUI create path.
 *
 * Uses the alternate screen buffer so each phase renders on a clean canvas
 * without ghost elements. On exit, the original terminal content is restored
 * and a summary is printed to the main buffer.
 */
export async function runCreateWizard(driver: VMDriver): Promise<void> {
  const React = (await import("react")).default;
  const { render } = await import("ink");
  const { App } = await import("../app.js");

  // Capture config when provisioning starts so we can clean up on Ctrl-C.
  // Ink intercepts Ctrl-C in raw mode (as a character, not SIGINT), so the
  // process-level signal handlers registered by runHeadlessFromConfig never
  // fire. We handle cleanup here instead.
  let provisionConfig: InstanceConfig | null = null;

  // Give Ink its own stdin stream via /dev/tty so it never touches
  // process.stdin. After Ink exits, the subprocess can inherit
  // process.stdin cleanly without competing for bytes on fd 0.
  let inkStdin: ReadStream | undefined;
  try {
    inkStdin = new ReadStream(openSync("/dev/tty", "r"));
  } catch {
    // /dev/tty unavailable (CI, piped, etc.) — Ink will use process.stdin
  }

  // Enter alternate screen buffer for a clean canvas. This prevents ghost
  // elements from Ink's differential rendering when the output height
  // shrinks between phases. On exit, the original terminal is restored.
  const useAltScreen = process.stdout.isTTY;
  if (useAltScreen) {
    process.stdout.write("\x1b[?1049h");
  }

  const renderOpts = inkStdin ? { stdin: inkStdin } : undefined;
  const instance = render(
    React.createElement(App, {
      driver,
      onProvisionStart: (cfg: InstanceConfig) => {
        provisionConfig = cfg;
      },
    }),
    renderOpts,
  );

  let exitResult: unknown;
  try {
    exitResult = await instance.waitUntilExit();
  } finally {
    // Leave alternate screen buffer — restores original terminal content
    if (useAltScreen) {
      process.stdout.write("\x1b[?1049l");
    }
    inkStdin?.destroy();
  }

  // Register instance if provisioning completed successfully
  if (
    exitResult &&
    typeof exitResult === "object" &&
    "action" in exitResult &&
    (exitResult as { action: string }).action === "created"
  ) {
    const { result } = exitResult as { action: string; result: HeadlessResult };
    await registerInstance(result, driver.name);
    printSummary(result);
  } else if (provisionConfig) {
    // Ctrl-C or error during provisioning — clean up the VM and project dir.
    // The abandoned headless pipeline's subprocesses keep the event loop
    // alive, so we must force-exit after cleanup.
    const vmConfig = configToVMConfig(provisionConfig);
    await cleanupVM(driver, vmConfig.vmName, vmConfig.projectDir);
    process.exit(130);
  }
}

/** Print a summary to the main terminal after leaving the alternate screen. */
function printSummary(result: HeadlessResult): void {
  const dashboardUrl = result.gatewayToken
    ? `http://localhost:${result.gatewayPort}/#token=${result.gatewayToken}`
    : `http://localhost:${result.gatewayPort}`;

  console.log(`\n\x1b[32m\u2713\x1b[0m \x1b[1m${result.name}\x1b[0m is ready\n`);
  console.log(`  Dashboard  ${dashboardUrl}`);
  if (result.tailscaleUrl) {
    console.log(`  Tailscale  ${result.tailscaleUrl}`);
  }
  console.log(`  Config     ${result.projectDir}/clawctl.json`);
  console.log();
  console.log(`  ${BIN_NAME} shell          Enter the VM`);
  console.log(`  ${BIN_NAME} oc dashboard   Open the dashboard`);
  console.log(`  ${BIN_NAME} status         Check instance health`);
  if (!result.providerType) {
    console.log(`  ${BIN_NAME} oc onboard     Configure a provider`);
  }
  console.log();
}

async function registerInstance(result: HeadlessResult, driverName: string): Promise<void> {
  const entry: RegistryEntry = {
    name: result.name,
    projectDir: result.projectDir,
    vmName: result.vmName,
    driver: driverName,
    createdAt: new Date().toISOString(),
    providerType: result.providerType,
    gatewayPort: result.gatewayPort,
    tailscaleUrl: result.tailscaleUrl,
  };
  await addInstance(entry);
}
