import { writeFile } from "fs/promises";
import { join } from "path";
import type { VMDriver } from "../drivers/types.js";
import { addInstance } from "../lib/registry.js";
import { GATEWAY_PORT } from "../templates/constants.js";
import { getTailscaleHostname } from "../lib/tailscale.js";
import type { RegistryEntry } from "../lib/registry.js";
import { BIN_NAME } from "../lib/bin-name.js";

/**
 * Run the headless create path: load config, provision, register.
 */
export async function runCreateHeadless(driver: VMDriver, configPath: string): Promise<void> {
  const { runHeadless } = await import("../headless.js");
  const result = await runHeadless(driver, configPath);

  const entry: RegistryEntry = {
    name: result.name,
    projectDir: result.projectDir,
    vmName: result.vmName,
    driver: result.driver,
    createdAt: new Date().toISOString(),
    providerType: result.providerType,
    gatewayPort: result.gatewayPort,
    tailscaleUrl: result.tailscaleUrl,
  };
  await addInstance(entry);
}

/**
 * Run the interactive wizard create path.
 * Returns when the wizard exits (either via onboard or finish).
 */
export async function runCreateWizard(driver: VMDriver): Promise<void> {
  const React = (await import("react")).default;
  const { render } = await import("ink");
  const { App } = await import("../app.js");
  const { extractGatewayToken } = await import("../lib/parse.js");

  type OnboardResult = {
    action: "onboard";
    vmName: string;
    projectDir: string;
    tailscaleMode?: "off" | "serve" | "funnel";
  };
  type FinishResult = {
    action: "finish";
    vmName: string;
    projectDir: string;
    tailscaleMode?: "off" | "serve" | "funnel";
  };

  const instance = render(React.createElement(App, { driver }));
  const result = await instance.waitUntilExit();

  // Ink may leave stdin listeners active. Fully detach before spawning
  // subprocesses with stdio: "inherit".
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
  process.stdin.removeAllListeners();
  process.stdin.pause();

  // Write minimal clawctl.json for wizard-created instances
  const writeMinimalConfig = async (vmName: string, projectDir: string) => {
    const minimal = { name: vmName, project: projectDir };
    await writeFile(join(projectDir, "clawctl.json"), JSON.stringify(minimal, null, 2) + "\n");
  };

  // Register the instance
  const registerWizardInstance = async (
    vmName: string,
    projectDir: string,
    tailscaleUrl?: string,
  ) => {
    const entry: RegistryEntry = {
      name: vmName,
      projectDir,
      vmName,
      driver: driver.name,
      createdAt: new Date().toISOString(),
      gatewayPort: GATEWAY_PORT,
      tailscaleUrl,
    };
    await addInstance(entry);
  };

  if (
    result &&
    typeof result === "object" &&
    "action" in result &&
    (result as OnboardResult).action === "onboard"
  ) {
    const { vmName, projectDir, tailscaleMode } = result as OnboardResult;

    await registerWizardInstance(vmName, projectDir);
    await writeMinimalConfig(vmName, projectDir);

    console.log("");
    console.log("--- OpenClaw Onboarding (running inside VM) ---");
    console.log("");

    try {
      const onboardResult = await driver.execInteractive(vmName, "openclaw onboard --skip-daemon");
      console.log("");

      if (onboardResult.exitCode !== 0) {
        console.log(`Warning: Onboarding exited with code ${onboardResult.exitCode}`);
        console.log(`   You can retry: ${driver.shellCommand(vmName)} -- openclaw onboard`);
      } else {
        console.log("Installing gateway service...");
        const installResult = await driver.exec(
          vmName,
          "openclaw daemon install --runtime node --force",
        );
        if (installResult.exitCode !== 0) {
          console.log("Warning: Gateway service install failed. You can retry:");
          console.log(
            `   ${driver.shellCommand(vmName)} -- openclaw daemon install --runtime node --force`,
          );
        } else {
          console.log("Starting gateway...");
          await driver.exec(vmName, "openclaw daemon start");
          await driver.exec(vmName, "openclaw config set tools.profile full");
          await driver.exec(
            vmName,
            "openclaw config set agents.defaults.workspace /mnt/project/data/workspace",
          );
          // Configure Tailscale gateway mode + allowedOrigins before restart
          if (tailscaleMode && tailscaleMode !== "off") {
            await driver.exec(
              vmName,
              `openclaw config set gateway.tailscale.mode ${tailscaleMode}`,
            );
            const tsHostname = await getTailscaleHostname(driver, vmName);
            if (tsHostname) {
              const tsUrl = `https://${tsHostname}`;
              await driver.exec(
                vmName,
                `openclaw config set gateway.controlUi.allowedOrigins '["${tsUrl}"]'`,
              );
            }
          }

          await driver.exec(vmName, "openclaw daemon restart");

          const envResult = await driver.exec(
            vmName,
            "systemctl --user show openclaw-gateway.service -p Environment",
          );
          const token = extractGatewayToken(envResult.stdout);

          const doctorResult = await driver.exec(vmName, "openclaw doctor");
          if (doctorResult.exitCode === 0) {
            console.log("OpenClaw setup complete — openclaw doctor passed");
          } else {
            console.log("Warning: Setup finished but openclaw doctor reported issues");
          }

          console.log("");
          if (token) {
            console.log(`Dashboard: http://localhost:${GATEWAY_PORT}/#token=${token}`);
          } else {
            console.log(`Dashboard: http://localhost:${GATEWAY_PORT}`);
          }
          console.log(`Enter VM:  ${driver.shellCommand(vmName)}`);

          // Update registry with Tailscale URL if serve/funnel mode
          if (tailscaleMode && tailscaleMode !== "off") {
            const tsHostnameForRegistry = await getTailscaleHostname(driver, vmName);
            if (tsHostnameForRegistry) {
              const tsBaseUrl = `https://${tsHostnameForRegistry}`;
              console.log(`Tailscale: ${tsBaseUrl}`);
              console.log("  First tailnet connection requires device approval:");
              console.log(`  ${BIN_NAME} shell ${vmName}`);
              console.log("  openclaw devices list && openclaw devices approve <requestId>");
              const { loadRegistry, saveRegistry } = await import("../lib/registry.js");
              const registry = await loadRegistry();
              if (registry.instances[vmName]) {
                registry.instances[vmName].tailscaleUrl = tsBaseUrl;
                await saveRegistry(registry);
              }
            }
          }

          const bootstrapCheck = await driver.exec(
            vmName,
            "test -f ~/.openclaw/workspace/BOOTSTRAP.md && echo yes || echo no",
          );
          if (bootstrapCheck.stdout.trim() === "yes") {
            console.log("");
            console.log("--- First conversation (the agent wants to meet you) ---");
            console.log("");
            await driver.execInteractive(
              vmName,
              "openclaw tui --message 'You just woke up. Time to figure out who you are.'",
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to run onboarding:", err);
      console.log(`   You can retry: ${driver.shellCommand(vmName)} -- openclaw onboard`);
    }
  } else if (
    result &&
    typeof result === "object" &&
    "action" in result &&
    (result as FinishResult).action === "finish"
  ) {
    const { vmName, projectDir, tailscaleMode } = result as FinishResult;

    // Query Tailscale URL if serve/funnel mode was selected
    let tailscaleUrl: string | undefined;
    if (tailscaleMode && tailscaleMode !== "off") {
      const tsHostname = await getTailscaleHostname(driver, vmName);
      if (tsHostname) tailscaleUrl = `https://${tsHostname}`;
    }

    await registerWizardInstance(vmName, projectDir, tailscaleUrl);
    await writeMinimalConfig(vmName, projectDir);
  }
}
