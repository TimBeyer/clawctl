import { readFile, writeFile, unlink, rename, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { randomBytes } from "crypto";
import {
  DAEMON_PID_PATH,
  DAEMON_SOCKET_PATH,
  DAEMON_STDOUT_PATH,
  DAEMON_STDERR_PATH,
  DAEMON_LOG_DIR,
} from "./paths.js";
import { sendRequest } from "./client.js";
import { spawn } from "child_process";
import { openSync } from "fs";

async function readPidFile(): Promise<number | null> {
  try {
    const raw = await readFile(DAEMON_PID_PATH, "utf-8");
    const pid = parseInt(raw.trim(), 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export async function writePidFile(pid: number): Promise<void> {
  await mkdir(dirname(DAEMON_PID_PATH), { recursive: true });
  const tmpPath = `${DAEMON_PID_PATH}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmpPath, `${pid}\n`);
  await rename(tmpPath, DAEMON_PID_PATH);
}

export async function removePidFile(): Promise<void> {
  await unlink(DAEMON_PID_PATH).catch(() => {});
}

export async function removeSocketFile(): Promise<void> {
  await unlink(DAEMON_SOCKET_PATH).catch(() => {});
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function socketResponds(): Promise<{ alive: boolean; version?: string }> {
  try {
    const response = await sendRequest("ping", {}, 2000);
    if (response.ok && response.data) {
      const data = response.data as { version?: string };
      return { alive: true, version: data.version };
    }
    return { alive: true };
  } catch {
    return { alive: false };
  }
}

export async function isDaemonRunning(): Promise<{
  running: boolean;
  pid?: number;
  version?: string;
}> {
  const pid = await readPidFile();
  if (pid === null) return { running: false };

  if (!isProcessAlive(pid)) {
    // Stale PID file
    await removePidFile();
    await removeSocketFile();
    return { running: false };
  }

  const { alive, version } = await socketResponds();
  if (!alive) {
    // Process alive but socket unresponsive — stale
    return { running: false, pid };
  }

  return { running: true, pid, version };
}

function detectSpawnArgs(): { command: string; args: string[] } {
  // If running as a compiled binary, process.execPath IS the binary
  // In dev mode (bun), we need to point at the CLI source
  const execPath = process.execPath;
  const isBun = execPath.endsWith("/bun") || execPath.endsWith("/bun.exe");

  if (isBun) {
    // Dev mode: find the CLI entry point relative to this file
    // packages/daemon/src/lifecycle.ts → packages/cli/bin/cli.tsx
    const cliEntry = resolve(import.meta.dir, "../../cli/bin/cli.tsx");
    return { command: execPath, args: [cliEntry, "daemon", "run"] };
  }

  // Compiled binary — use self
  return { command: execPath, args: ["daemon", "run"] };
}

export async function spawnDaemon(): Promise<number> {
  await mkdir(DAEMON_LOG_DIR, { recursive: true });

  const { command, args } = detectSpawnArgs();

  const stdout = openSync(DAEMON_STDOUT_PATH, "a");
  const stderr = openSync(DAEMON_STDERR_PATH, "a");

  const child = spawn(command, args, {
    detached: true,
    stdio: ["ignore", stdout, stderr],
    env: { ...process.env },
  });

  child.unref();

  const pid = child.pid;
  if (!pid) {
    throw new Error("Failed to spawn daemon process");
  }

  return pid;
}

async function waitForSocket(timeoutMs: number = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { alive } = await socketResponds();
    if (alive) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

export async function ensureDaemon(opts?: {
  verbose?: boolean;
  currentVersion?: string;
}): Promise<void> {
  const status = await isDaemonRunning();

  if (status.running && status.pid) {
    // Check version mismatch
    if (opts?.currentVersion && status.version && status.version !== opts.currentVersion) {
      if (opts.verbose) {
        console.log(`Upgrading daemon (${status.version} → ${opts.currentVersion})`);
      }
      await stopDaemon();
      // Fall through to respawn
    } else {
      return; // Already running, version matches
    }
  }

  // Clean up stale files if process is dead
  if (!status.running) {
    await removePidFile();
    await removeSocketFile();
  }

  const pid = await spawnDaemon();

  const ready = await waitForSocket();
  if (!ready) {
    throw new Error("Daemon started but socket not responding after 3s");
  }

  if (opts?.verbose) {
    console.log(`Daemon started (PID ${pid})`);
  }
}

/**
 * Tell the daemon to re-check instance states immediately.
 * Fire-and-forget — failures are silently ignored.
 */
export async function notifyDaemon(): Promise<void> {
  try {
    await sendRequest("sync", {}, 2000);
  } catch {
    // Daemon not running or unresponsive — nothing to do
  }
}

export async function stopDaemon(): Promise<void> {
  // Try graceful shutdown via socket
  try {
    await sendRequest("shutdown", {}, 5000);
  } catch {
    // Socket unreachable — try SIGTERM
    const pid = await readPidFile();
    if (pid !== null && isProcessAlive(pid)) {
      process.kill(pid, "SIGTERM");
    }
  }

  // Wait briefly for cleanup
  await new Promise((r) => setTimeout(r, 500));

  // Clean up stale files
  await removePidFile();
  await removeSocketFile();
}
