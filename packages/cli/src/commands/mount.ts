import { readFile, writeFile, access } from "fs/promises";
import { constants } from "fs";
import { join, resolve } from "path";
import type { VMDriver } from "@clawctl/host-core";
import { requireInstance } from "@clawctl/host-core";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import type { MountSpec } from "@clawctl/types";

const BUILTIN_MOUNT_POINTS = new Set([PROJECT_MOUNT_POINT, `${PROJECT_MOUNT_POINT}/data`]);

export async function runMountList(driver: VMDriver, opts: { instance?: string }): Promise<void> {
  const entry = await requireInstance(opts);
  const mounts = await driver.readMounts(entry.vmName);

  if (mounts.length === 0) {
    console.log("No mounts configured.");
    return;
  }

  // Column widths
  const locW = Math.max(8, ...mounts.map((m) => m.location.length));
  const mpW = Math.max(11, ...mounts.map((m) => m.mountPoint.length));

  console.log(
    `${"LOCATION".padEnd(locW)}  ${"MOUNT POINT".padEnd(mpW)}  ${"MODE".padEnd(5)}  TYPE`,
  );
  for (const m of mounts) {
    const mode = m.writable ? "rw" : "ro";
    const type = BUILTIN_MOUNT_POINTS.has(m.mountPoint) ? "built-in" : "user";
    console.log(
      `${m.location.padEnd(locW)}  ${m.mountPoint.padEnd(mpW)}  ${mode.padEnd(5)}  ${type}`,
    );
  }
}

export async function runMountAdd(
  driver: VMDriver,
  opts: { instance?: string; writable?: boolean; noRestart?: boolean },
  hostPath: string,
  guestPath: string,
): Promise<void> {
  const entry = await requireInstance(opts);
  const resolvedHost = resolve(hostPath.replace(/^~/, process.env.HOME ?? "~"));

  // Validate host path exists
  try {
    await access(resolvedHost, constants.R_OK);
  } catch {
    console.warn(`Warning: host path "${resolvedHost}" does not exist yet.`);
  }

  // Read current mounts, check for duplicates
  const mounts = await driver.readMounts(entry.vmName);
  const existing = mounts.find((m) => m.mountPoint === guestPath);
  if (existing) {
    console.error(`Mount point "${guestPath}" is already in use (→ ${existing.location}).`);
    process.exit(1);
  }

  // Add the new mount
  const newMount: MountSpec = {
    location: hostPath,
    mountPoint: guestPath,
    writable: opts.writable ?? false,
  };
  mounts.push(newMount);

  // Apply
  await applyMountChange(driver, entry, mounts, opts.noRestart);
  await syncClawctlJson(entry.projectDir, mounts);

  console.log(
    `Added mount: ${hostPath} → ${guestPath} (${newMount.writable ? "read-write" : "read-only"})`,
  );
}

export async function runMountRemove(
  driver: VMDriver,
  opts: { instance?: string; noRestart?: boolean },
  guestPath: string,
): Promise<void> {
  const entry = await requireInstance(opts);

  // Prevent removing built-in mounts
  if (BUILTIN_MOUNT_POINTS.has(guestPath)) {
    console.error(`Cannot remove built-in mount "${guestPath}".`);
    process.exit(1);
  }

  // Read current mounts
  const mounts = await driver.readMounts(entry.vmName);
  const idx = mounts.findIndex((m) => m.mountPoint === guestPath);
  if (idx === -1) {
    console.error(`No mount found at "${guestPath}".`);
    process.exit(1);
  }

  const removed = mounts[idx];
  mounts.splice(idx, 1);

  // Apply
  await applyMountChange(driver, entry, mounts, opts.noRestart);
  await syncClawctlJson(entry.projectDir, mounts);

  console.log(`Removed mount: ${removed.location} → ${guestPath}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function applyMountChange(
  driver: VMDriver,
  entry: { vmName: string; name: string },
  mounts: MountSpec[],
  noRestart?: boolean,
): Promise<void> {
  const status = await driver.status(entry.vmName);

  if (status === "Running") {
    if (noRestart) {
      await driver.stop(entry.vmName);
      await driver.writeMounts(entry.vmName, mounts);
      console.log("Mount config updated. VM stopped — start it manually to apply.");
      return;
    }
    console.log(`Restarting "${entry.name}" to apply mount change...`);
    await driver.stop(entry.vmName);
    await driver.writeMounts(entry.vmName, mounts);
    await driver.start(entry.vmName);
  } else {
    await driver.writeMounts(entry.vmName, mounts);
    console.log("Mount config updated. Start the VM to apply.");
  }
}

/**
 * Sync the user-added mounts (excluding built-ins) to clawctl.json
 * so they survive a full VM rebuild.
 */
async function syncClawctlJson(projectDir: string, allMounts: MountSpec[]): Promise<void> {
  const configPath = join(projectDir, "clawctl.json");
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(await readFile(configPath, "utf-8"));
  } catch {
    // No clawctl.json — nothing to sync
    return;
  }

  const userMounts = allMounts.filter((m) => !BUILTIN_MOUNT_POINTS.has(m.mountPoint));
  if (userMounts.length > 0) {
    config.mounts = userMounts.map((m) => ({
      location: m.location,
      mountPoint: m.mountPoint,
      ...(m.writable ? { writable: true } : {}),
    }));
  } else {
    delete config.mounts;
  }

  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
}
