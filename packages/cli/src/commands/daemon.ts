import {
  ensureDaemon,
  isDaemonRunning,
  stopDaemon,
  sendRequest,
  runDaemon,
  readLogLines,
  formatLogLine,
  DAEMON_LOG_PATH,
} from "@clawctl/daemon";
import { watch } from "fs";

export async function runDaemonStart(): Promise<void> {
  const status = await isDaemonRunning();
  if (status.running) {
    console.log(`Daemon already running (PID ${status.pid})`);
    return;
  }

  await ensureDaemon({ verbose: true });

  // Query status to show instance count
  try {
    const response = await sendRequest("status");
    if (response.ok && response.data) {
      const data = response.data as { pid: number; instances: unknown[] };
      console.log(`Watching ${data.instances?.length ?? 0} instance(s)`);
    }
  } catch {
    // Status query failed — daemon started but might still be initializing
  }
}

export async function runDaemonStop(): Promise<void> {
  const status = await isDaemonRunning();
  if (!status.running) {
    console.log("Daemon is not running.");
    return;
  }

  console.log(`Stopping daemon (PID ${status.pid})...`);
  await stopDaemon();
  console.log("Daemon stopped.");
}

export async function runDaemonRestart(): Promise<void> {
  const status = await isDaemonRunning();
  if (status.running) {
    console.log(`Stopping daemon (PID ${status.pid})...`);
    await stopDaemon();
  }

  await ensureDaemon({ verbose: true });

  try {
    const response = await sendRequest("status");
    if (response.ok && response.data) {
      const data = response.data as { pid: number; instances: unknown[] };
      console.log(`Watching ${data.instances?.length ?? 0} instance(s)`);
    }
  } catch {
    // Status query might fail during startup
  }
}

export async function runDaemonStatus(): Promise<void> {
  const status = await isDaemonRunning();
  if (!status.running) {
    console.log("Daemon is not running.");
    return;
  }

  const response = await sendRequest("status");
  if (!response.ok) {
    console.error(`Error: ${response.error}`);
    process.exit(1);
  }

  const data = response.data as {
    pid: number;
    uptime: number;
    version: string;
    instances: Array<{ name: string; vmStatus: string }>;
    tasks: Array<{ name: string; label: string; instance?: string }>;
  };

  console.log(`Daemon status:`);
  console.log(`  PID:      ${data.pid}`);
  console.log(`  Uptime:   ${formatUptime(data.uptime)}`);
  console.log(`  Version:  ${data.version}`);

  if (data.instances.length > 0) {
    console.log(`\nInstances:`);
    for (const inst of data.instances) {
      console.log(`  ${inst.name.padEnd(20)} ${inst.vmStatus}`);
    }
  } else {
    console.log(`\nNo instances registered.`);
  }

  if (data.tasks.length > 0) {
    console.log(`\nActive tasks:`);
    for (const task of data.tasks) {
      const target = task.instance ? ` (${task.instance})` : "";
      console.log(`  ${task.label}${target}`);
    }
  }
}

export async function runDaemonLogs(opts: { follow?: boolean; lines?: number }): Promise<void> {
  const count = opts.lines ?? 50;
  const lines = await readLogLines(count);

  for (const line of lines) {
    console.log(formatLogLine(line));
  }

  if (opts.follow) {
    // Tail the log file
    try {
      const watcher = watch(DAEMON_LOG_PATH, async () => {
        const newLines = await readLogLines(10);
        // Print only lines we haven't seen (simple: just print last few)
        for (const line of newLines.slice(-5)) {
          console.log(formatLogLine(line));
        }
      });

      process.on("SIGINT", () => {
        watcher.close();
        process.exit(0);
      });

      await new Promise(() => {}); // Keep alive
    } catch {
      console.error("Cannot follow log file. Is the daemon running?");
      process.exit(1);
    }
  }
}

export async function runDaemonRun(): Promise<void> {
  // This is the actual daemon entry point — runs in foreground
  await runDaemon();
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return `${days}d ${hrs}h`;
}
