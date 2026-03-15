/**
 * Pure parsing functions extracted from CLI and library code for testability.
 */

/**
 * Extract the gateway token from `systemctl --user show` output.
 * Expected format: `Environment=OPENCLAW_GATEWAY_TOKEN=<token> ...`
 * Returns empty string if token is not found.
 */
export function extractGatewayToken(systemctlOutput: string): string {
  const match = systemctlOutput.match(/OPENCLAW_GATEWAY_TOKEN=(\S+)/);
  return match?.[1] ?? "";
}

/**
 * Parse the Lima version from `limactl --version` output.
 * Expected format: `limactl version 1.2.3`
 * Returns undefined if the version cannot be parsed.
 */
export function parseLimaVersion(versionOutput: string): string | undefined {
  const match = versionOutput.match(/limactl version ([\d.]+)/);
  return match?.[1];
}
