/** Explicit host→guest mount pair. */
export interface MountSpec {
  /** Host path to mount (e.g. "~", "/opt/data"). */
  location: string;
  /** Guest mount point (e.g. "/mnt/host", "/mnt/data"). */
  mountPoint: string;
  /** Whether the mount is writable. Default: false (read-only). */
  writable?: boolean;
}

export interface VMConfig {
  projectDir: string;
  vmName: string;
  cpus: number;
  memory: string;
  disk: string;
  /** Extra host directories to mount into the VM. */
  extraMounts?: MountSpec[];
}

/** Config-file-driven instance specification for headless provisioning. */
export interface InstanceConfig {
  /** Instance name — becomes the VM name. */
  name: string;
  /** Host directory for project files, config, and gateway state. */
  project: string;

  /** VM resource allocation. All optional, sensible defaults. */
  resources?: {
    cpus?: number;
    memory?: string;
    disk?: string;
  };

  /** Network and connectivity. */
  network?: {
    forwardGateway?: boolean;
    /** Host-side port for gateway forward. VM always uses 18789 internally. */
    gatewayPort?: number;
    /** Gateway auth token. Injected into openclaw config if set. */
    gatewayToken?: string;
  };

  /** Additional tools to install (future, deprecated — use capabilities). */
  tools?: Record<string, boolean | Record<string, unknown>>;

  /** Capability configs. true = enabled with defaults. Object = enabled with config. */
  capabilities?: Record<string, true | Record<string, unknown>>;

  /** Extra host directories to mount into the VM. */
  mounts?: MountSpec[];

  /** Agent behavior. */
  agent?: {
    skipOnboarding?: boolean;
    toolsProfile?: string;
    sandbox?: boolean;
  };

  /** Model provider configuration. Required for full bootstrap. */
  provider?: {
    /** Provider type (e.g. "anthropic", "openai", "gemini", "custom"). */
    type: string;
    /** API key. Required for all providers except custom. */
    apiKey?: string;
    /** Model identifier override. */
    model?: string;
    /** Base URL (required for custom providers). */
    baseUrl?: string;
    /** Model ID (required for custom providers). */
    modelId?: string;
    /** API compatibility mode for custom providers. */
    compatibility?: string;
    /** Provider ID for custom providers. */
    providerId?: string;
  };

  /**
   * Agent identity bootstrap prompt, sent after daemon restart.
   * - String: sent as-is for full control.
   * - Object: agent name + freeform context; we generate the prompt, the
   *   agent's own BOOTSTRAP.md handles file creation.
   */
  bootstrap?:
    | string
    | {
        agent: {
          name: string;
          /** Freeform identity context — creature, vibe, emoji, backstory, whatever. */
          context?: string;
        };
        user?: {
          name: string;
          /** Freeform user context — timezone, preferences, household, etc. */
          context?: string;
        };
      };

  /**
   * Communication channels (Telegram, Discord, Slack, WhatsApp, etc.).
   * Each key is a channel name; the value is channel-specific config.
   */
  channels?: Record<string, Record<string, unknown>>;

  /**
   * Arbitrary OpenClaw config passthrough.
   * Each key is a dotpath (e.g., "session.dmScope"), applied via
   * `openclaw config set` during bootstrap. No host-side validation.
   */
  openclaw?: Record<string, unknown>;

  /**
   * Telegram channel (optional).
   * @deprecated Use `channels.telegram` instead.
   */
  telegram?: {
    /** Bot token from BotFather. */
    botToken: string;
    /** Telegram user IDs allowed to DM the bot. */
    allowFrom?: string[];
    /** Group IDs and their settings. */
    groups?: Record<string, { requireMention?: boolean }>;
  };
}
