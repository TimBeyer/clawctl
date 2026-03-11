import type { VMDriver } from "../drivers/types.js";

/**
 * Query the Tailscale daemon for the VM's DNS name.
 * Returns the FQDN without trailing dot, or undefined on failure.
 */
export async function getTailscaleHostname(
  driver: VMDriver,
  vmName: string,
): Promise<string | undefined> {
  const result = await driver.exec(vmName, "tailscale status --json");
  if (result.exitCode !== 0) return undefined;

  try {
    const status = JSON.parse(result.stdout);
    const dnsName = status.Self?.DNSName;
    if (typeof dnsName === "string" && dnsName.length > 0) {
      return dnsName.replace(/\.$/, "");
    }
  } catch {
    // non-JSON output
  }
  return undefined;
}
