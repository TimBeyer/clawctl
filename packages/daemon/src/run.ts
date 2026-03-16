import { LimaDriver, listInstances } from "@clawctl/host-core";
import { createServer, listenOnSocket, closeServer } from "./server.js";
import { writePidFile, removePidFile, removeSocketFile } from "./lifecycle.js";
import { loadDaemonConfig } from "./config.js";
import { initLogging, setLogLevel, writeLog } from "./logging.js";
import { Scheduler } from "./scheduler.js";
import { getDefaultTasks } from "./tasks/registry.js";
import { createCheckpointWatchTask } from "./tasks/checkpoint-watch.js";
import { createHealthMonitorTask } from "./tasks/health-monitor.js";
import { computeBuildHash } from "./build-hash.js";
import type { RequestHandler } from "./server.js";

export async function runDaemon(): Promise<void> {
  // 1. Initialize logging
  await initLogging();
  await writeLog("info", "Daemon starting");

  // 2. Write PID file
  await writePidFile(process.pid);

  // 3. Load config
  const config = await loadDaemonConfig();
  if (config.logLevel) {
    setLogLevel(config.logLevel);
  }

  // 4. Set up driver and scheduler
  const driver = new LimaDriver();
  const tasks = getDefaultTasks();
  const scheduler = new Scheduler(driver, config, tasks);

  // Register task factories for per-instance cloning
  scheduler.registerTaskFactory("checkpoint-watch", createCheckpointWatchTask);
  scheduler.registerTaskFactory("health-monitor", createHealthMonitorTask);

  const startTime = Date.now();

  // Read package version
  let version = "unknown";
  try {
    const pkg = await import("../../../package.json");
    version = pkg.version ?? pkg.default?.version ?? "unknown";
  } catch {
    // Version not available
  }

  // Compute build hash for staleness detection
  const buildHash = await computeBuildHash();
  await writeLog("info", `Build hash: ${buildHash}`);

  // 5. Create IPC server
  const handler: RequestHandler = async (method, _params) => {
    switch (method) {
      case "ping": {
        return {
          ok: true,
          data: {
            pid: process.pid,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            version,
            buildHash,
          },
        };
      }

      case "status": {
        const instances = await listInstances();
        const schedulerStatus = scheduler.getStatus();
        const instanceStatuses = await Promise.all(
          instances.map(async (entry) => {
            let vmStatus: string;
            try {
              vmStatus = await driver.status(entry.vmName);
            } catch {
              vmStatus = "Unknown";
            }
            return { name: entry.name, vmStatus };
          }),
        );
        return {
          ok: true,
          data: {
            pid: process.pid,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            version,
            buildHash,
            instances: instanceStatuses,
            tasks: schedulerStatus.tasks,
          },
        };
      }

      case "sync": {
        await writeLog("debug", "Instance sync requested via IPC");
        await scheduler.sync();
        return { ok: true, data: { synced: true } };
      }

      case "reload": {
        await writeLog("info", "Reloading config and registry");
        const newConfig = await loadDaemonConfig();
        if (newConfig.logLevel) {
          setLogLevel(newConfig.logLevel);
        }
        await scheduler.reload(newConfig);
        return { ok: true, data: { reloaded: true } };
      }

      case "shutdown": {
        await writeLog("info", "Shutdown requested via IPC");
        // Respond before shutting down
        setImmediate(() => shutdown());
        return { ok: true, data: { shutting_down: true } };
      }

      default:
        return { ok: false, error: `Unknown method: ${method}` };
    }
  };

  const server = createServer(handler);

  // 6. Bind socket
  await listenOnSocket(server);
  await writeLog("info", `Socket listening, PID ${process.pid}`);

  // 7. Start scheduler
  await scheduler.start();

  const instanceCount = (await listInstances()).length;
  await writeLog("info", `Daemon ready, watching ${instanceCount} instance(s)`);

  // 8. Graceful shutdown
  let shuttingDown = false;

  async function shutdown(): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    await writeLog("info", "Shutting down...");

    await scheduler.stop();
    await closeServer(server);
    await removePidFile();
    await removeSocketFile();

    await writeLog("info", "Daemon stopped");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown());
  process.on("SIGINT", () => shutdown());

  // Keep process alive
  await new Promise(() => {});
}
