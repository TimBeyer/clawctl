import type { VMConfig } from "../types.js";

export type OnLine = (line: string) => void;

export interface VMCreateOptions {
  forwardGateway?: boolean;
  gatewayPort?: number;
  /** Extra host directories to mount read-only (e.g. ["~", "~/.ssh"]). */
  extraMounts?: string[];
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface VMDriver {
  readonly name: string;

  // Lifecycle
  create(config: VMConfig, options?: VMCreateOptions, onLine?: OnLine): Promise<void>;
  start(name: string): Promise<void>;
  stop(name: string): Promise<void>;
  delete(name: string): Promise<void>;

  // Query
  exists(name: string): Promise<boolean>;
  status(name: string): Promise<"Running" | "Stopped" | "Unknown">;

  // Execution
  exec(name: string, command: string, onLine?: OnLine): Promise<ExecResult>;
  execInteractive(name: string, command: string): Promise<{ exitCode: number }>;
  runScript(
    name: string,
    scriptPath: string,
    asRoot?: boolean,
    onLine?: OnLine,
  ): Promise<ExecResult>;
  copy(name: string, localPath: string, remotePath: string): Promise<void>;

  // Host prerequisites
  isInstalled(): Promise<boolean>;
  install(onLine?: OnLine): Promise<string>; // returns version
  version(): Promise<string | undefined>;

  // Interactive
  shell(name: string): Promise<{ exitCode: number }>;

  // Display
  shellCommand(name: string): string;
}
