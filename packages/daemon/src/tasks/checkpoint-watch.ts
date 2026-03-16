import { watch, type FSWatcher } from "fs";
import { readFile, unlink, stat, rm } from "fs/promises";
import { join } from "path";
import { exec } from "@clawctl/host-core";
import { CHECKPOINT_REQUEST_FILE } from "@clawctl/types";
import type { RegistryEntry } from "@clawctl/host-core";
import type { DaemonTask, DaemonTaskContext } from "./types.js";

interface CheckpointRequest {
  timestamp: string;
  message: string;
}

async function handleCheckpoint(
  dataDir: string,
  log: (level: "debug" | "info" | "warn" | "error", msg: string) => void,
): Promise<void> {
  const signalPath = join(dataDir, CHECKPOINT_REQUEST_FILE);

  let request: CheckpointRequest;
  try {
    const content = await readFile(signalPath, "utf-8");
    request = JSON.parse(content);
  } catch {
    return; // Signal file vanished or malformed
  }

  const commitMessage = `checkpoint: ${request.message}`;
  const projectDir = join(dataDir, "..");

  log("info", `Checkpoint: ${request.message}`);

  // Guard: remove nested .git in workspace if present
  const nestedGit = join(dataDir, "workspace", ".git");
  try {
    await stat(nestedGit);
    log("warn", "Removing nested .git in data/workspace/");
    await rm(nestedGit, { recursive: true, force: true });
  } catch {
    // No nested .git — expected
  }

  const addResult = await exec("git", ["add", "data/"], { cwd: projectDir });
  if (addResult.exitCode !== 0) {
    log("error", `git add failed: ${addResult.stderr}`);
    return;
  }

  const diffResult = await exec("git", ["diff", "--cached", "--quiet"], {
    cwd: projectDir,
  });
  if (diffResult.exitCode === 0) {
    log("debug", "No changes to commit");
    await unlink(signalPath).catch(() => {});
    return;
  }

  const statResult = await exec("git", ["diff", "--cached", "--stat"], {
    cwd: projectDir,
  });

  const commitResult = await exec("git", ["commit", "-m", commitMessage], {
    cwd: projectDir,
  });
  if (commitResult.exitCode !== 0) {
    log("error", `git commit failed: ${commitResult.stderr}`);
    return;
  }

  log("info", `Committed: ${commitMessage}`);
  if (statResult.stdout) {
    log("debug", statResult.stdout.trim().split("\n").pop() ?? "");
  }

  await unlink(signalPath).catch(() => {});
}

export function createCheckpointWatchTask(): DaemonTask {
  let watcher: FSWatcher | undefined;
  let pollInterval: Timer | undefined;
  let processing = false;

  return {
    name: "checkpoint-watch",
    label: "Checkpoint Watch",
    scope: "per-instance",
    intervalMs: 2000,

    async start(ctx: DaemonTaskContext, instance?: RegistryEntry): Promise<void> {
      if (!instance) return;

      const dataDir = join(instance.projectDir, "data");
      const signalPath = join(dataDir, CHECKPOINT_REQUEST_FILE);
      const pollMs = ctx.config.tasks?.checkpoint?.pollIntervalMs ?? 2000;

      const log = (level: "debug" | "info" | "warn" | "error", msg: string) => {
        ctx.log(level, msg);
      };

      // Verify data dir exists
      try {
        await stat(dataDir);
      } catch {
        log("warn", `Data directory not found: ${dataDir}`);
        return;
      }

      // Handle unconsumed checkpoint on startup
      try {
        await stat(signalPath);
        await handleCheckpoint(dataDir, log);
      } catch {
        // No existing signal
      }

      const onSignal = async () => {
        if (processing) return;
        processing = true;
        try {
          await handleCheckpoint(dataDir, log);
        } finally {
          processing = false;
        }
      };

      // Try fs.watch, fall back to polling
      try {
        watcher = watch(dataDir, async (_eventType, filename) => {
          if (filename === CHECKPOINT_REQUEST_FILE) {
            await onSignal();
          }
        });
        log("info", "Watching with fs.watch");
      } catch {
        log("info", "fs.watch unavailable, using polling");
        pollInterval = setInterval(async () => {
          try {
            await stat(signalPath);
            await onSignal();
          } catch {
            // No signal file
          }
        }, pollMs);
      }
    },

    async tick(_ctx: DaemonTaskContext, _instance?: RegistryEntry): Promise<void> {
      // Checkpoint watching is event-driven (fs.watch / polling), not tick-driven.
      // The tick is a no-op — the task runs via its own watcher/interval set in start().
    },

    async stop(): Promise<void> {
      watcher?.close();
      watcher = undefined;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = undefined;
      }
      processing = false;
    },
  };
}
