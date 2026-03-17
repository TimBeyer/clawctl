/**
 * Capability extension system types.
 *
 * A capability is a self-contained, versioned provisioning module that hooks
 * into lifecycle phases (with pre/main/post timing), contributes doctor checks,
 * declares config schemas, and supports sequential migrations.
 *
 * Capabilities use the CapabilityContext SDK for all VM interactions — they
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
 *
 * Only low-level primitives belong here — capabilities own all
 * provisioning logic.
 */
export interface CapabilityContext {
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

  /** APT package management — low-level system primitive. */
  apt: {
    install: (packages: string[]) => Promise<void>;
    isInstalled: (pkg: string) => Promise<boolean>;
  };

  /** systemd service management — low-level system primitive. */
  systemd: {
    enable: (service: string) => Promise<void>;
    isEnabled: (service: string) => Promise<boolean>;
    isActive: (service: string) => Promise<boolean>;
    daemonReload: () => Promise<void>;
    enableLinger: (user: string) => Promise<void>;
    findDefaultUser: () => Promise<string>;
  };

  /** AGENTS.md managed-section SDK action. Idempotent. */
  agentsMd: {
    update: (owner: string, content: string) => Promise<void>;
  };

  /** Read the provision config written by the host. */
  readProvisionConfig: () => Promise<ProvisionConfig>;
}

/** A single provision step within a capability hook. */
export interface CapabilityStep {
  name: string;
  label: string;
  run: (ctx: CapabilityContext) => Promise<ProvisionResult>;
}

/** A doctor check contributed by a capability. */
export interface DoctorCheckDef {
  name: string;
  /** Phase after which this check is expected to pass. Defaults to the hook's phase. */
  availableAfter?: LifecyclePhase;
  run: (ctx: CapabilityContext) => Promise<{ passed: boolean; detail?: string; error?: string }>;
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
  run: (ctx: CapabilityContext) => Promise<ProvisionResult>;
}

// ---------------------------------------------------------------------------
// Capability config definition types
// ---------------------------------------------------------------------------

/** Field types supported by the config definition / TUI form. */
export type ConfigFieldType = "text" | "password" | "select";

/**
 * Recursive JSON Pointer paths for nested config objects.
 * Produces union of paths like "/auth" | "/auth/key" | "/mode".
 */
export type JsonPointer<T> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]:
        | `/${K}`
        | (T[K] extends Record<string, unknown> ? `/${K}${JsonPointer<T[K]>}` : never);
    }[keyof T & string]
  : never;

/**
 * Path into a config object.
 * - Top-level: plain key, e.g. "authKey"
 * - Nested: JSON Pointer (RFC 6901), e.g. "/auth/key"
 */
export type ConfigPath<T> = (keyof T & string) | JsonPointer<T>;

/** A single field in a capability's config definition. */
export interface CapabilityConfigField<TConfig = Record<string, unknown>> {
  /**
   * Path into the capability's config object.
   * Plain key for top-level fields, JSON Pointer for nested.
   * Typed against TConfig — TypeScript catches invalid paths.
   */
  path: ConfigPath<TConfig>;
  /** Display label in the TUI form. */
  label: string;
  /** Determines the input widget and Zod schema derivation. */
  type: ConfigFieldType;
  /** Whether this field must be provided. Zod: required fields are not .optional(). */
  required?: boolean;
  /** Whether this field contains a secret (for sanitization + input masking). */
  secret?: boolean;
  /** Options for select fields. Values are used to derive z.enum(). */
  options?: { label: string; value: string }[];
  /** Default value for the field. */
  defaultValue?: string;
  /** Placeholder text shown in the TUI form input. */
  placeholder?: string;
  /** Contextual help shown in the TUI sidebar when this field is focused. */
  help?: { title: string; lines: string[] };
}

/**
 * Unified config definition for a capability.
 *
 * Declares both the config schema (via field definitions, Zod is derived)
 * and the TUI form layout. The TypeScript config interface is the contract;
 * `defineCapabilityConfig<T>()` ensures field paths type-check against it.
 */
export interface CapabilityConfigDef<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Section label in the TUI wizard. */
  sectionLabel: string;
  /** Sidebar help shown when the section header is focused. */
  sectionHelp?: { title: string; lines: string[] };
  /** Fields in this section. Each maps to a path in TConfig. */
  fields: CapabilityConfigField<TConfig>[];
  /** Compute a summary string for the collapsed section header. */
  summary?: (values: Partial<Record<keyof TConfig & string, string>>) => string;
  /** Cross-field validation. Return an error string, or null if valid. */
  refine?: (values: Partial<TConfig>) => string | null;
}

/**
 * Type-safe helper for defining a capability config.
 *
 * Validates field paths against TConfig at the definition site, then
 * returns a type-erased `CapabilityConfigDef` for storage on `CapabilityDef`.
 * This is intentional — the generic does its job at compile time, but the
 * stored value doesn't carry the parameter since `CapabilityDef[]` arrays
 * can't hold mixed generics.
 */
export function defineCapabilityConfig<T extends Record<string, unknown>>(
  def: CapabilityConfigDef<T>,
): CapabilityConfigDef {
  return def as CapabilityConfigDef;
}

// ---------------------------------------------------------------------------
// Host-side setup hook result
// ---------------------------------------------------------------------------

/** Result of a host-side capability setup action. */
export interface HostSetupResult {
  success: boolean;
  detail?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// CapabilityDef
// ---------------------------------------------------------------------------

/**
 * Full capability definition — an atomic, self-contained provisioning module.
 *
 * Capabilities are plain constant objects. They declare their metadata,
 * lifecycle hooks, doctor checks, migrations, and config definitions in a
 * single file (or directory for complex capabilities).
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

  /**
   * Unified config definition: declares the config schema (Zod is derived
   * from field definitions) and the TUI form layout. Use
   * `defineCapabilityConfig<T>()` for type-safe field paths.
   */
  configDef?: CapabilityConfigDef;
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
