import type { RegistryEntry } from "@clawctl/host-core";
import type { DaemonTask, DaemonTaskContext } from "./types.js";

export function createHealthMonitorTask(): DaemonTask {
  const previousStatus: Map<string, string> = new Map();

  return {
    name: "health-monitor",
    label: "Health Monitor",
    scope: "per-instance",
    intervalMs: 30_000,

    async start(ctx: DaemonTaskContext, instance?: RegistryEntry): Promise<void> {
      if (!instance) return;
      // Record initial status
      try {
        const status = await ctx.driver.status(instance.vmName);
        previousStatus.set(instance.name, status);
        ctx.log("info", `Initial status: ${status}`);
      } catch (err) {
        ctx.log("warn", `Could not get initial status: ${err}`);
      }
    },

    async tick(ctx: DaemonTaskContext, instance?: RegistryEntry): Promise<void> {
      if (!instance) return;

      let currentStatus: string;
      try {
        currentStatus = await ctx.driver.status(instance.vmName);
      } catch (err) {
        ctx.log("warn", `Status check failed: ${err}`);
        return;
      }

      const prev = previousStatus.get(instance.name);
      previousStatus.set(instance.name, currentStatus);

      if (prev && prev !== currentStatus) {
        ctx.log("info", `Status changed: ${prev} → ${currentStatus}`);

        if (prev === "Running" && currentStatus !== "Running") {
          ctx.log("warn", "Instance stopped unexpectedly");

          const autoRestart = ctx.config.tasks?.healthMonitor?.autoRestart ?? false;
          if (autoRestart) {
            ctx.log("info", "Auto-restart enabled, starting instance...");
            try {
              await ctx.driver.start(instance.vmName);
              ctx.log("info", "Instance restarted successfully");
            } catch (err) {
              ctx.log("error", `Auto-restart failed: ${err}`);
            }
          }
        }
      }
    },

    async stop(): Promise<void> {
      previousStatus.clear();
    },
  };
}
