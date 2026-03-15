import type { VMDriver } from "@clawctl/host-core";
import { requireInstance } from "@clawctl/host-core";

const HEALTH_RETRIES = 5;
const HEALTH_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runRestart(driver: VMDriver, opts: { instance?: string }): Promise<void> {
  const entry = await requireInstance(opts);

  // Stop (if running)
  const currentStatus = await driver.status(entry.vmName);
  if (currentStatus === "Running") {
    console.log(`Stopping "${entry.name}"...`);
    await driver.stop(entry.vmName);
  }

  // Start
  console.log(`Starting "${entry.name}"...`);
  await driver.start(entry.vmName);

  // Verify SSH ready
  console.log("Waiting for VM to be ready...");
  let sshReady = false;
  for (let i = 0; i < HEALTH_RETRIES; i++) {
    const result = await driver.exec(entry.vmName, "echo ready");
    if (result.exitCode === 0 && result.stdout.trim() === "ready") {
      sshReady = true;
      break;
    }
    await sleep(HEALTH_DELAY_MS);
  }

  if (!sshReady) {
    console.error("Warning: VM started but SSH is not responding.");
    return;
  }

  // Run openclaw doctor
  console.log("Running health checks...");
  const doctorResult = await driver.exec(entry.vmName, "openclaw doctor");

  // Check gateway service
  const gatewayResult = await driver.exec(
    entry.vmName,
    "systemctl --user is-active openclaw-gateway.service",
  );
  const gatewayActive = gatewayResult.stdout.trim() === "active";

  // Print summary
  console.log("");
  console.log(`Instance "${entry.name}" restarted.`);
  console.log(`  SSH:     ready`);
  console.log(`  Doctor:  ${doctorResult.exitCode === 0 ? "passed" : "issues detected"}`);
  console.log(`  Gateway: ${gatewayActive ? "active" : "inactive"}`);
}
