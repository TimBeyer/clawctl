import { watch, type FSWatcher } from "fs";
import { readFile, unlink, stat } from "fs/promises";
import { join } from "path";
import { exec } from "@clawctl/host-core";
import { requireInstance } from "@clawctl/host-core";
import { CHECKPOINT_REQUEST_FILE } from "@clawctl/types";
import { isDaemonRunning, ensureDaemon } from "@clawctl/daemon";

interface CheckpointRequest {
  timestamp: string;
  message: string;
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

async function handleCheckpoint(dataDir: string): Promise<void> {
  const signalPath = join(dataDir, CHECKPOINT_REQUEST_FILE);

  let request: CheckpointRequest;
  try {
    const content = await readFile(signalPath, "utf-8");
    request = JSON.parse(content);
  } catch {
    // Signal file vanished or malformed — skip
    return;
  }

  const commitMessage = `checkpoint: ${request.message}`;
  const projectDir = join(dataDir, "..");

  console.log(`[${timestamp()}] Checkpoint: ${request.message}`);

  // Guard: if a nested .git reappears inside the workspace (e.g. openclaw
  // recreated it), remove it before staging — otherwise git add will fail.
  const nestedGit = join(dataDir, "workspace", ".git");
  try {
    await stat(nestedGit);
    console.warn(`  Warning: removing nested .git in data/workspace/`);
    const { rm } = await import("fs/promises");
    await rm(nestedGit, { recursive: true, force: true });
  } catch {
    // No nested .git — expected
  }

  // Stage and commit data/
  const addResult = await exec("git", ["add", "data/"], { cwd: projectDir });
  if (addResult.exitCode !== 0) {
    console.error(`  git add failed: ${addResult.stderr}`);
    return;
  }

  // Check if there are staged changes
  const diffResult = await exec("git", ["diff", "--cached", "--quiet"], {
    cwd: projectDir,
  });
  if (diffResult.exitCode === 0) {
    console.log(`  No changes to commit`);
    await unlink(signalPath).catch(() => {});
    return;
  }

  // Log what's being committed
  const statResult = await exec("git", ["diff", "--cached", "--stat"], {
    cwd: projectDir,
  });

  const commitResult = await exec("git", ["commit", "-m", commitMessage], {
    cwd: projectDir,
  });
  if (commitResult.exitCode !== 0) {
    console.error(`  git commit failed: ${commitResult.stderr}`);
    return;
  }

  console.log(`  Committed: ${commitMessage}`);
  if (statResult.stdout) {
    console.log(`  ${statResult.stdout.trim().split("\n").pop()}`);
  }

  // Remove signal file after successful commit
  await unlink(signalPath).catch(() => {});
}

export async function runWatch(opts: {
  instance?: string;
  poll?: boolean;
  currentVersion?: string;
}): Promise<void> {
  // If daemon is running, delegate to it
  const daemonStatus = await isDaemonRunning();
  if (daemonStatus.running) {
    const entry = await requireInstance(opts);
    console.log(
      `Daemon is handling checkpoint watching for "${entry.name}" (PID ${daemonStatus.pid}).`,
    );
    console.log(`Use "clawctl daemon status" for details, or "clawctl daemon stop" to disable.`);
    return;
  }

  // No daemon — offer to start it, or fall back to foreground mode
  if (opts.currentVersion) {
    try {
      await ensureDaemon({ currentVersion: opts.currentVersion });
      const entry = await requireInstance(opts);
      console.log(`Daemon started. Checkpoint watching active for "${entry.name}".`);
      console.log(`Use "clawctl daemon status" for details.`);
      return;
    } catch {
      // Daemon failed to start — fall through to foreground mode
      console.log("Could not start daemon, falling back to foreground mode.\n");
    }
  }

  const entry = await requireInstance(opts);
  const dataDir = join(entry.projectDir, "data");

  // Verify data dir exists
  try {
    await stat(dataDir);
  } catch {
    console.error(`Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  const signalPath = join(dataDir, CHECKPOINT_REQUEST_FILE);

  console.log(`Watching ${entry.name} for checkpoint signals...`);
  console.log(`  Signal file: ${signalPath}`);
  console.log(`  Press Ctrl+C to stop`);
  console.log("");

  // Check for unconsumed checkpoint on startup
  try {
    await stat(signalPath);
    await handleCheckpoint(dataDir);
  } catch {
    // No existing signal — expected
  }

  let watcher: FSWatcher | undefined;
  let pollInterval: Timer | undefined;
  let processing = false;

  const onSignal = async () => {
    if (processing) return;
    processing = true;
    try {
      await handleCheckpoint(dataDir);
    } finally {
      processing = false;
    }
  };

  if (opts.poll) {
    // Polling fallback for virtiofs quirks
    pollInterval = setInterval(async () => {
      try {
        await stat(signalPath);
        await onSignal();
      } catch {
        // No signal file — expected
      }
    }, 2000);
  } else {
    // fs.watch with polling fallback
    try {
      watcher = watch(dataDir, async (eventType, filename) => {
        if (filename === CHECKPOINT_REQUEST_FILE) {
          await onSignal();
        }
      });
    } catch {
      // Fall back to polling if fs.watch fails
      console.log("  fs.watch unavailable, falling back to polling (2s interval)");
      pollInterval = setInterval(async () => {
        try {
          await stat(signalPath);
          await onSignal();
        } catch {
          // No signal file — expected
        }
      }, 2000);
    }
  }

  // Clean shutdown
  const cleanup = () => {
    console.log("\nStopping watch...");
    watcher?.close();
    if (pollInterval) clearInterval(pollInterval);
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Keep process alive
  await new Promise(() => {});
}
