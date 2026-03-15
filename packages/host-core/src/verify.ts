import type { VMDriver, OnLine } from "./drivers/types.js";

export interface VerifyResult {
  label: string;
  passed: boolean;
  error?: string;
}

/** Verify that all expected tools are installed in the VM. */
export async function verifyProvisioning(
  driver: VMDriver,
  vmName: string,
  onLine?: OnLine,
): Promise<VerifyResult[]> {
  const checks: { label: string; command: string; check: (stdout: string) => boolean }[] = [
    { label: "Node.js 22", command: "node --version", check: (out) => out.includes("v22") },
    { label: "Tailscale", command: "tailscale --version", check: () => true },
    { label: "Homebrew", command: "brew --version", check: () => true },
    { label: "1Password CLI", command: "op --version", check: () => true },
    { label: "OpenClaw", command: "openclaw --version", check: () => true },
  ];

  const results: VerifyResult[] = [];

  for (const { label, command, check } of checks) {
    const result = await driver.exec(vmName, command, onLine);
    if (result.exitCode === 0 && check(result.stdout)) {
      results.push({ label, passed: true });
    } else {
      results.push({ label, passed: false, error: `${label} not found` });
    }
  }

  return results;
}
