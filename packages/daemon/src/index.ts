// Client (CLI imports this to talk to daemon)
export { sendRequest } from "./client.js";
export type { DaemonRequest, DaemonResponse } from "./client.js";

// Lifecycle
export {
  isDaemonRunning,
  ensureDaemon,
  stopDaemon,
  spawnDaemon,
  notifyDaemon,
} from "./lifecycle.js";

// Config
export { loadDaemonConfig } from "./config.js";
export type { DaemonConfig } from "./config.js";

// Paths
export {
  DAEMON_PID_PATH,
  DAEMON_SOCKET_PATH,
  DAEMON_CONFIG_PATH,
  DAEMON_LOG_DIR,
  DAEMON_LOG_PATH,
  DAEMON_STDOUT_PATH,
  DAEMON_STDERR_PATH,
} from "./paths.js";

// Logging (for CLI log reading)
export { readLogLines, formatLogLine } from "./logging.js";

// Runner (called by `clawctl daemon run`)
export { runDaemon } from "./run.js";

// Build hash
export { computeBuildHash } from "./build-hash.js";

// Task types
export type { DaemonTask, DaemonTaskContext } from "./tasks/types.js";
