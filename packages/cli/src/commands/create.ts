import { openSync } from "node:fs";
import { ReadStream } from "node:tty";
import type { VMDriver } from "@clawctl/host-core";
import { addInstance, runHeadless } from "@clawctl/host-core";
import type { RegistryEntry, HeadlessResult } from "@clawctl/host-core";

/**
 * Run the headless create path: load config, provision, register.
 */
export async function runCreateHeadless(driver: VMDriver, configPath: string): Promise<void> {
  const result = await runHeadless(driver, configPath);
  await registerInstance(result, driver.name);
}

/**
 * Run the interactive TUI create path.
 * The TUI collects an InstanceConfig, then delegates to the headless pipeline.
 */
export async function runCreateWizard(driver: VMDriver): Promise<void> {
  const React = (await import("react")).default;
  const { render } = await import("ink");
  const { App } = await import("../app.js");

  // Give Ink its own stdin stream via /dev/tty so it never touches
  // process.stdin. After Ink exits, the subprocess can inherit
  // process.stdin cleanly without competing for bytes on fd 0.
  let inkStdin: ReadStream | undefined;
  try {
    inkStdin = new ReadStream(openSync("/dev/tty", "r"));
  } catch {
    // /dev/tty unavailable (CI, piped, etc.) — Ink will use process.stdin
  }

  const renderOpts = inkStdin ? { stdin: inkStdin } : undefined;
  const instance = render(React.createElement(App, { driver }), renderOpts);
  const exitResult = await instance.waitUntilExit();

  // Destroy Ink's private stdin
  inkStdin?.destroy();

  // Register instance if provisioning completed successfully
  if (
    exitResult &&
    typeof exitResult === "object" &&
    "action" in exitResult &&
    (exitResult as { action: string }).action === "created"
  ) {
    const { result } = exitResult as { action: string; result: HeadlessResult };
    await registerInstance(result, driver.name);
  }
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
