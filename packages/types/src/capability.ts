/**
 * Capability extension system types.
 *
 * A capability is a self-contained, versioned provisioning module that hooks
 * into lifecycle phases (with pre/main/post timing), contributes doctor checks
 * and AGENTS.md sections, declares config schemas, and supports sequential
 * migrations.
 *
 * Capabilities use the ProvisionContext SDK for all VM interactions — they
 * never import VM-side tools directly. This makes them safe to import from
 * both the host CLI (for config validation) and the VM CLI (for execution).
 */

import type { LifecyclePhase } from "./constants.js";

/** Whether a hook's steps run as root or as the normal user. */
export type ExecContext = "root" | "user";

/**
 * Hook key: plain phase name for main timing, or prefixed for pre/post.
 *
 * Examples:
 *   "provision-system"       — runs during the phase (main)
 *   "pre:provision-system"   — runs before main hooks
 *   "post:provision-system"  — runs after main hooks
 */
export type PhaseHookKey = LifecyclePhase | `pre:${LifecyclePhase}` | `post:${LifecyclePhase}`;

/** Result of a single provision step. */
export interface ProvisionResult {
  name: string;
  status: "installed" | "unchanged" | "failed";
  detail?: string;
  error?: string;
}

/** Exec result from running a command. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Options for exec calls. */
export interface ExecOptions {
  quiet?: boolean;
  env?: Record<string, string | undefined>;
}

/**
 * SDK context injected into all capability steps and checks.
 *
 * Capabilities use this instead of importing VM-side tools directly.
 * The real implementation lives in vm-cli and delegates to exec, fs, etc.
 */
export interface ProvisionContext {
  /** Run a command. */
  exec: (command: string, args?: string[], opts?: ExecOptions) => Promise<ExecResult>;
  /** Check if a command exists on PATH. */
  commandExists: (command: string) => Promise<boolean>;
  /** Log progress messages. */
  log: (message: string) => void;

  /** File operations. */
  fs: {
    readFile: (path: string, encoding?: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    mkdir: (path: string, opts?: { recursive?: boolean; mode?: number }) => Promise<void>;
    chmod: (path: string, mode: number) => Promise<void>;
    rename: (from: string, to: string) => Promise<void>;
    rm: (path: string, opts?: { recursive?: boolean; force?: boolean }) => Promise<void>;
    stat: (path: string) => Promise<{ isFile: () => boolean; isDirectory: () => boolean }>;
    access: (path: string, mode?: number) => Promise<void>;
    ensureLineInFile: (path: string, line: string) => Promise<boolean>;
    ensureDir: (path: string, mode?: number) => Promise<void>;
  };

  /** Network operations. */
  net: {
    downloadFile: (url: string, dest: string) => Promise<void>;
    downloadAndRun: (url: string, args?: string[]) => Promise<void>;
  };

  /** Shell profile management. */
  profile: {
    ensureInBashrc: (line: string) => Promise<boolean>;
    ensureInProfile: (line: string) => Promise<void>;
    ensurePath: (pathEntry: string) => Promise<void>;
  };

  /** Read the provision config written by the host. */
  readProvisionConfig: () => Promise<ProvisionConfig>;
}

/** A single provision step within a capability hook. */
export interface CapabilityStep {
  name: string;
  label: string;
  run: (ctx: ProvisionContext) => Promise<ProvisionResult>;
}

/** A doctor check contributed by a capability. */
export interface DoctorCheckDef {
  name: string;
  /** Phase after which this check is expected to pass. Defaults to the hook's phase. */
  availableAfter?: LifecyclePhase;
  run: (ctx: ProvisionContext) => Promise<{ passed: boolean; detail?: string; error?: string }>;
}

/** A single lifecycle hook into a phase. */
export interface CapabilityHook {
  /** Whether this hook's steps run as root or user. */
  execContext: ExecContext;
  /** Provision steps for this phase. */
  steps: CapabilityStep[];
  /** Doctor checks for this phase. */
  doctorChecks?: DoctorCheckDef[];
}

/** Sequential migration step (like DB migrations). */
export interface CapabilityMigration {
  /** Version this migration upgrades FROM. */
  from: string;
  /** Version this migration upgrades TO. */
  to: string;
  run: (ctx: ProvisionContext) => Promise<ProvisionResult>;
}

/**
 * Full capability definition — an atomic, self-contained provisioning module.
 *
 * Capabilities are plain constant objects. They declare their metadata,
 * lifecycle hooks, doctor checks, migrations, config schema, and AGENTS.md
 * contributions in a single file.
 */
export interface CapabilityDef {
  /** Unique identifier: "tailscale", "one-password", "system-base". */
  name: string;
  /** Human-readable label for logs. */
  label: string;
  /** Semver version for migration tracking. */
  version: string;
  /** Whether this is always-on (core) or user-toggleable (optional). */
  core: boolean;

  /** Other capability names that must be provisioned first. */
  dependsOn?: string[];

  /**
   * Whether enabled given the current config.
   * Core capabilities ignore this (always enabled).
   * Optional capabilities are disabled unless explicitly enabled in config.
   */
  enabled?: (config: ProvisionConfig) => boolean;

  /**
   * Hooks into lifecycle phases. A capability can hook into multiple phases,
   * and each phase has pre/main/post timing:
   *   "provision-system"       — runs during the phase (main)
   *   "pre:provision-system"   — runs before main hooks
   *   "post:provision-system"  — runs after main hooks
   */
  hooks: Partial<Record<PhaseHookKey, CapabilityHook>>;

  /** Ordered migration chain (like DB migrations). */
  migrations?: CapabilityMigration[];

  /** Zod schema for this capability's config section (optional). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configSchema?: any;

  /** Markdown snippet to include in AGENTS.md managed section. */
  agentsMdSection?: string;
}

/** Tracks installed capability versions inside the VM. */
export interface CapabilityState {
  installed: Record<string, { version: string; installedAt: string }>;
}

/**
 * Feature flags / capability config written by the host, read by claw.
 *
 * The `capabilities` map replaces the old boolean flags.
 * Old fields are kept for backwards compatibility.
 */
export interface ProvisionConfig {
  /** Enabled capabilities and their config. true = enabled with defaults. */
  capabilities: Record<string, true | Record<string, unknown>>;

  // --- Backwards compatibility (deprecated, mapped to capabilities internally) ---
  /** @deprecated Use capabilities["one-password"] instead. */
  onePassword?: boolean;
  /** @deprecated Use capabilities["tailscale"] instead. */
  tailscale?: boolean;
}
