import type { DaemonTask } from "./types.js";
import { createCheckpointWatchTask } from "./checkpoint-watch.js";
import { createHealthMonitorTask } from "./health-monitor.js";

export function getDefaultTasks(): DaemonTask[] {
  return [createCheckpointWatchTask(), createHealthMonitorTask()];
}
