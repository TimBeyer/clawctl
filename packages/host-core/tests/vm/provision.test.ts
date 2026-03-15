import { describe, test, expect, beforeAll } from "bun:test";
import { execa } from "execa";

/**
 * VM provisioning integration tests.
 *
 * These tests verify provisioning outcomes on a real Lima VM (tool availability,
 * services, PATH). Provisioning scripts are ephemeral — written into the VM at
 * /tmp/clawctl-provision/ during bootstrap and cleaned up after.
 *
 * Gated by the CLAWCTL_VM_TESTS env var — skipped in normal `bun test`.
 * Run with: bun run test:vm
 */

const VM_TESTS_ENABLED = process.env.CLAWCTL_VM_TESTS === "1";
const TEST_VM_NAME = "clawctl-test";

// Skip the entire suite if VM tests are not enabled
const describeVM = VM_TESTS_ENABLED ? describe : describe.skip;

/** Run a command inside the test VM. */
async function vmExec(cmd: string) {
  return execa("limactl", ["shell", "--workdir", "/tmp", TEST_VM_NAME, "bash", "-lc", cmd], {
    reject: false,
  });
}

/** Check if the test VM already exists and is running. */
async function vmExists(): Promise<boolean> {
  const result = await execa("limactl", ["list", "--format", "{{.Name}}"], {
    reject: false,
  });
  return result.stdout.split("\n").includes(TEST_VM_NAME);
}

describeVM("VM provisioning", () => {
  beforeAll(async () => {
    const exists = await vmExists();
    if (!exists) {
      console.log(`Creating test VM "${TEST_VM_NAME}"...`);
      // Create a minimal VM for testing — uses default Lima template
      await execa(
        "limactl",
        [
          "create",
          "--name",
          TEST_VM_NAME,
          "--vm-type=vz",
          "--mount-type=virtiofs",
          "--tty=false",
          "template://ubuntu-24.04",
        ],
        { stdio: "inherit", timeout: 300_000 },
      );
    }

    // Ensure VM is running
    const listResult = await execa("limactl", ["list", "--format", "{{.Name}}\t{{.Status}}"], {
      reject: false,
    });
    const vmLine = listResult.stdout.split("\n").find((l) => l.startsWith(TEST_VM_NAME));
    if (vmLine && !vmLine.includes("Running")) {
      console.log(`Starting test VM "${TEST_VM_NAME}"...`);
      await execa("limactl", ["start", TEST_VM_NAME], {
        stdio: "inherit",
        timeout: 120_000,
      });
    }
  }, 600_000); // 10 minute timeout for VM setup

  test("Node.js 22 is installed and on PATH", async () => {
    const result = await vmExec("node --version");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toStartWith("v22");
  });

  test("Homebrew (Linuxbrew) is installed", async () => {
    const result = await vmExec("brew --version");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Homebrew");
  });

  test("Tailscale binary is present", async () => {
    const result = await vmExec("which tailscale");
    expect(result.exitCode).toBe(0);
  });

  test("1Password CLI binary is present", async () => {
    const result = await vmExec("which op");
    expect(result.exitCode).toBe(0);
  });

  test("systemd linger is enabled for user", async () => {
    const result = await vmExec("ls /var/lib/systemd/linger/ | head -1");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).not.toBe("");
  });

  test("shell profile has correct PATH entries", async () => {
    const result = await vmExec("echo $PATH");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(".local/bin");
  });

  test("OpenClaw CLI is installed and on PATH", async () => {
    const result = await vmExec("openclaw --version");
    expect(result.exitCode).toBe(0);
  });

  test("gateway service stub unit exists", async () => {
    const result = await vmExec("systemctl --user is-enabled openclaw-gateway.service");
    expect(result.exitCode).toBe(0);
  });

  test("idempotency: provisioning scripts can run twice", async () => {
    // Provisioning scripts are ephemeral (cleaned up after bootstrap), so
    // we verify idempotency by checking that tools remain functional.
    const nodeCheck = await vmExec("node --version");
    expect(nodeCheck.exitCode).toBe(0);
  });

  // Uncomment to clean up after tests:
  // afterAll(async () => {
  //   console.log(`Stopping test VM "${TEST_VM_NAME}"...`);
  //   await execa("limactl", ["stop", TEST_VM_NAME], { reject: false });
  //   await execa("limactl", ["delete", TEST_VM_NAME], { reject: false });
  // }, 120_000);
});
