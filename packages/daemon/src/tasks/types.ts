import type { VMDriver, RegistryEntry } from "@clawctl/host-core";
import type { DaemonConfig } from "../config.js";

export interface DaemonTaskContext {
  driver: VMDriver;
  loadRegistry: () => Promise<import("@clawctl/host-core").Registry>;
  log: (level: "debug" | "info" | "warn" | "error", msg: string) => void;
  config: DaemonConfig;
}

export interface DaemonTask {
  name: string;
  label: string;
  scope: "global" | "per-instance";
  intervalMs: number;

  start(ctx: DaemonTaskContext, instance?: RegistryEntry): Promise<void>;
  tick(ctx: DaemonTaskContext, instance?: RegistryEntry): Promise<void>;
  stop(): Promise<void>;
}
