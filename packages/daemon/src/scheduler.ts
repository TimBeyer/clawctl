import type { RegistryEntry } from "@clawctl/host-core";
import { loadRegistry, listInstances, type VMDriver } from "@clawctl/host-core";
import type { DaemonTask, DaemonTaskContext } from "./tasks/types.js";
import type { DaemonConfig } from "./config.js";
import { writeLog } from "./logging.js";

interface ActiveTask {
  task: DaemonTask;
  instance?: RegistryEntry;
  lastRun: number;
}

export class Scheduler {
  private activeTasks = new Map<string, ActiveTask>();
  private tickTimer: Timer | undefined;
  private registryPollTimer: Timer | undefined;
  private driver: VMDriver;
  private config: DaemonConfig;
  private tasks: DaemonTask[];
  private stopped = false;

  constructor(driver: VMDriver, config: DaemonConfig, tasks: DaemonTask[]) {
    this.driver = driver;
    this.config = config;
    this.tasks = tasks;
  }

  private taskKey(taskName: string, instanceName?: string): string {
    return instanceName ? `${taskName}:${instanceName}` : taskName;
  }

  private makeContext(taskName: string, instanceName?: string): DaemonTaskContext {
    return {
      driver: this.driver,
      loadRegistry: () => loadRegistry(),
      log: (level, msg) => {
        writeLog(level, msg, {
          task: taskName,
          ...(instanceName ? { instance: instanceName } : {}),
        });
      },
      config: this.config,
    };
  }

  async start(): Promise<void> {
    this.stopped = false;

    // Start global tasks
    for (const task of this.tasks) {
      if (task.scope === "global") {
        if (this.isTaskDisabled(task.name)) continue;
        const key = this.taskKey(task.name);
        const ctx = this.makeContext(task.name);
        try {
          await task.start(ctx);
          this.activeTasks.set(key, { task, lastRun: 0 });
          await writeLog("info", `Started global task: ${task.label}`, {
            task: task.name,
          });
        } catch (err) {
          await writeLog("error", `Failed to start task: ${err}`, {
            task: task.name,
          });
        }
      }
    }

    // Start per-instance tasks
    await this.syncInstances();

    // Poll registry for changes every 30s
    this.registryPollTimer = setInterval(() => {
      this.syncInstances().catch((err) => {
        writeLog("error", `Registry sync failed: ${err}`);
      });
    }, 30_000);

    // Main tick loop at 1s resolution
    this.tickTimer = setInterval(() => {
      this.tick().catch((err) => {
        writeLog("error", `Tick failed: ${err}`);
      });
    }, 1000);
  }

  private isTaskDisabled(taskName: string): boolean {
    if (taskName === "checkpoint-watch") {
      return this.config.tasks?.checkpoint?.disabled === true;
    }
    if (taskName === "health-monitor") {
      return this.config.tasks?.healthMonitor?.disabled === true;
    }
    return false;
  }

  private getTaskInterval(task: DaemonTask): number {
    if (task.name === "checkpoint-watch") {
      return this.config.tasks?.checkpoint?.pollIntervalMs ?? task.intervalMs;
    }
    if (task.name === "health-monitor") {
      return this.config.tasks?.healthMonitor?.intervalMs ?? task.intervalMs;
    }
    return task.intervalMs;
  }

  private async syncInstances(): Promise<void> {
    const instances = await listInstances();

    // Determine which instances to watch
    let targetInstances: RegistryEntry[];
    if (this.config.instances && this.config.instances.length > 0) {
      targetInstances = instances.filter((i) => this.config.instances!.includes(i.name));
    } else if (this.config.autoWatch !== false) {
      targetInstances = instances;
    } else {
      targetInstances = [];
    }

    const targetNames = new Set(targetInstances.map((i) => i.name));

    // Start tasks for new instances
    for (const task of this.tasks) {
      if (task.scope !== "per-instance") continue;
      if (this.isTaskDisabled(task.name)) continue;

      for (const instance of targetInstances) {
        const key = this.taskKey(task.name, instance.name);
        if (!this.activeTasks.has(key)) {
          const freshTask = this.createFreshTask(task);
          const ctx = this.makeContext(task.name, instance.name);
          try {
            await freshTask.start(ctx, instance);
            this.activeTasks.set(key, {
              task: freshTask,
              instance,
              lastRun: 0,
            });
            await writeLog("info", `Started task for instance`, {
              task: task.name,
              instance: instance.name,
            });
          } catch (err) {
            await writeLog("error", `Failed to start task: ${err}`, {
              task: task.name,
              instance: instance.name,
            });
          }
        }
      }
    }

    // Stop tasks for removed instances
    for (const [key, active] of this.activeTasks) {
      if (active.instance && !targetNames.has(active.instance.name)) {
        try {
          await active.task.stop();
        } catch (err) {
          await writeLog("error", `Failed to stop task: ${err}`, {
            task: active.task.name,
            instance: active.instance.name,
          });
        }
        this.activeTasks.delete(key);
        await writeLog("info", `Stopped task (instance removed)`, {
          task: active.task.name,
          instance: active.instance.name,
        });
      }
    }
  }

  private taskFactories = new Map<string, () => DaemonTask>();

  registerTaskFactory(name: string, factory: () => DaemonTask): void {
    this.taskFactories.set(name, factory);
  }

  private createFreshTask(template: DaemonTask): DaemonTask {
    const factory = this.taskFactories.get(template.name);
    if (factory) return factory();
    return template;
  }

  private async tick(): Promise<void> {
    const now = Date.now();

    for (const [_key, active] of this.activeTasks) {
      const interval = this.getTaskInterval(active.task);
      if (now - active.lastRun < interval) continue;

      active.lastRun = now;
      const ctx = this.makeContext(active.task.name, active.instance?.name);

      try {
        await active.task.tick(ctx, active.instance);
      } catch (err) {
        await writeLog("error", `Task tick failed: ${err}`, {
          task: active.task.name,
          instance: active.instance?.name,
        });
      }
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
    if (this.registryPollTimer) {
      clearInterval(this.registryPollTimer);
      this.registryPollTimer = undefined;
    }

    // Stop all active tasks in parallel with timeout
    const stopPromises = Array.from(this.activeTasks.values()).map(async (active) => {
      try {
        await Promise.race([
          active.task.stop(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Task stop timed out")), 5000),
          ),
        ]);
      } catch (err) {
        await writeLog("warn", `Task stop error: ${err}`, {
          task: active.task.name,
          instance: active.instance?.name,
        });
      }
    });

    await Promise.all(stopPromises);
    this.activeTasks.clear();
  }

  async reload(config: DaemonConfig): Promise<void> {
    this.config = config;
    await this.stop();
    await this.start();
  }

  getStatus(): { tasks: Array<{ name: string; instance?: string }> } {
    const tasks = Array.from(this.activeTasks.entries()).map(([_key, active]) => ({
      name: active.task.name,
      label: active.task.label,
      instance: active.instance?.name,
    }));
    return { tasks };
  }
}
