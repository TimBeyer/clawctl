import { homedir } from "os";
import type { VMDriver } from "../drivers/types.js";
import { listInstances } from "../lib/registry.js";
import { BIN_NAME } from "../lib/bin-name.js";

export async function runList(driver: VMDriver): Promise<void> {
  const entries = await listInstances();

  if (entries.length === 0) {
    console.log("No instances registered.");
    console.log("");
    console.log(`Create one with:     ${BIN_NAME} create`);
    console.log(`Or register one:     ${BIN_NAME} register <name> --project <path>`);
    return;
  }

  // Query live status for each entry
  const rows = await Promise.all(
    entries.map(async (entry) => {
      const status = await driver.status(entry.vmName);
      return {
        name: entry.name,
        status,
        project: shortenHome(entry.projectDir),
        provider: entry.providerType ?? "-",
        port: String(entry.gatewayPort),
        tailscale: entry.tailscaleUrl ?? "-",
      };
    }),
  );

  const hasTailscale = rows.some((r) => r.tailscale !== "-");

  // Calculate column widths
  const cols = {
    name: Math.max(4, ...rows.map((r) => r.name.length)),
    status: Math.max(6, ...rows.map((r) => r.status.length)),
    project: Math.max(7, ...rows.map((r) => r.project.length)),
    provider: Math.max(8, ...rows.map((r) => r.provider.length)),
    port: Math.max(4, ...rows.map((r) => r.port.length)),
    ...(hasTailscale && {
      tailscale: Math.max(9, ...rows.map((r) => r.tailscale.length)),
    }),
  };

  const headerParts = [
    "NAME".padEnd(cols.name),
    "STATUS".padEnd(cols.status),
    "PROJECT".padEnd(cols.project),
    "PROVIDER".padEnd(cols.provider),
    "PORT".padEnd(cols.port),
  ];
  if (hasTailscale) {
    headerParts.push("TAILSCALE".padEnd(cols.tailscale!));
  }
  console.log(headerParts.join("  "));

  for (const row of rows) {
    const parts = [
      row.name.padEnd(cols.name),
      row.status.padEnd(cols.status),
      row.project.padEnd(cols.project),
      row.provider.padEnd(cols.provider),
      row.port.padEnd(cols.port),
    ];
    if (hasTailscale) {
      parts.push(row.tailscale.padEnd(cols.tailscale!));
    }
    console.log(parts.join("  "));
  }
}

function shortenHome(path: string): string {
  const home = homedir();
  if (path.startsWith(home)) {
    return "~" + path.slice(home.length);
  }
  return path;
}
