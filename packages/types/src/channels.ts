/**
 * Channel definition system — data-driven channel configuration.
 *
 * Each ChannelDef declares the essential fields for a communication channel
 * (credential + key settings). These drive validation, wizard rendering,
 * bootstrap command generation, and secret sanitization.
 *
 * Only essential fields are modeled (~1-3 per channel). Optional channel
 * fields flow through the `openclaw` passthrough or `openclaw config set`.
 */

import type { CapabilityConfigField, CapabilityConfigDef } from "./capability.js";

/**
 * A communication channel that OpenClaw can connect to.
 *
 * ChannelDefs are lighter than CapabilityDefs — they don't install software
 * or hook into lifecycle phases. They just declare config fields that get
 * applied via `openclaw config set` during bootstrap.
 */
export interface ChannelDef {
  /** Channel identifier in OpenClaw config (e.g., "telegram", "discord"). */
  name: string;
  /** Human-readable label for wizard/logs. */
  label: string;
  /** Plugin name to enable (e.g., "telegram", "discord"). */
  pluginName: string;
  /**
   * Config definition — same shape as capability configDef.
   * Declares essential fields, drives Zod derivation and wizard rendering.
   */
  configDef: CapabilityConfigDef;
  /**
   * Extra commands to run after the field-derived config commands.
   * Receives the channel config object and returns additional
   * `openclaw config set` commands.
   */
  postCommands?: (config: Record<string, unknown>) => string[];
}

// ---------------------------------------------------------------------------
// Shared enabled toggle — first field in every channel
// ---------------------------------------------------------------------------

const enabledField: CapabilityConfigField = {
  path: "enabled",
  label: "Enabled",
  type: "toggle",
};

// ---------------------------------------------------------------------------
// Channel definitions
// ---------------------------------------------------------------------------

const telegramChannel: ChannelDef = {
  name: "telegram",
  label: "Telegram",
  pluginName: "telegram",
  configDef: {
    sectionLabel: "Telegram",
    sectionHelp: {
      title: "Telegram Bot",
      lines: [
        "Connect your agent to Telegram.",
        "Create a bot via @BotFather and paste the token here.",
        "allowFrom restricts DMs to specific Telegram user IDs.",
      ],
    },
    fields: [
      enabledField,
      {
        path: "botToken",
        label: "Bot Token",
        type: "password",
        required: true,
        secret: true,
        placeholder: "123456:ABC-DEF1234...",
        help: {
          title: "Telegram Bot Token",
          lines: ["Get this from @BotFather on Telegram.", "Supports op:// and env:// references."],
        },
      },
      {
        path: "allowFrom",
        label: "Allow From",
        type: "text",
        placeholder: "user_id_1, user_id_2",
        help: {
          title: "Allowed Users",
          lines: [
            "Comma-separated Telegram user IDs allowed to DM the bot.",
            "Leave empty to use pairing mode (approve via CLI).",
          ],
        },
      },
    ],
    summary: (values) =>
      values.enabled === "true" ? (values.botToken ? "configured" : "enabled") : "",
  },
  postCommands: (config) => {
    const cmds: string[] = [];
    // allowFrom → set allowlist, then dmPolicy
    const allowFrom = config.allowFrom;
    if (Array.isArray(allowFrom) && allowFrom.length > 0) {
      cmds.push(`openclaw config set channels.telegram.allowFrom '${JSON.stringify(allowFrom)}'`);
      cmds.push("openclaw config set channels.telegram.dmPolicy allowlist");
    }
    // groups
    const groups = config.groups;
    if (groups && typeof groups === "object") {
      const groupIds = Object.keys(groups);
      if (groupIds.length > 0) {
        cmds.push(
          `openclaw config set channels.telegram.groupAllowFrom '${JSON.stringify(groupIds)}'`,
        );
      }
      for (const [id, settings] of Object.entries(groups as Record<string, Record<string, unknown>>)) {
        if (settings.requireMention !== undefined) {
          cmds.push(
            `openclaw config set channels.telegram.groups.${id}.requireMention ${settings.requireMention}`,
          );
        }
      }
    }
    return cmds;
  },
};

const discordChannel: ChannelDef = {
  name: "discord",
  label: "Discord",
  pluginName: "discord",
  configDef: {
    sectionLabel: "Discord",
    sectionHelp: {
      title: "Discord Bot",
      lines: [
        "Connect your agent to Discord.",
        "Create a bot in the Discord Developer Portal.",
        "Enable Message Content intent and add to your server.",
      ],
    },
    fields: [
      enabledField,
      {
        path: "token",
        label: "Bot Token",
        type: "password",
        required: true,
        secret: true,
        placeholder: "MTIzNDU2Nzg5...",
        help: {
          title: "Discord Bot Token",
          lines: [
            "From Discord Developer Portal → Bot → Token.",
            "Supports op:// and env:// references.",
          ],
        },
      },
    ],
    summary: (values) =>
      values.enabled === "true" ? (values.token ? "configured" : "enabled") : "",
  },
};

const slackChannel: ChannelDef = {
  name: "slack",
  label: "Slack",
  pluginName: "slack",
  configDef: {
    sectionLabel: "Slack",
    sectionHelp: {
      title: "Slack App",
      lines: [
        "Connect your agent to Slack via Socket Mode.",
        "Create a Slack App, enable Socket Mode,",
        "and generate both a Bot Token and App Token.",
      ],
    },
    fields: [
      enabledField,
      {
        path: "botToken",
        label: "Bot Token",
        type: "password",
        required: true,
        secret: true,
        placeholder: "xoxb-...",
        help: {
          title: "Slack Bot Token",
          lines: [
            "OAuth Bot Token (xoxb-...) from your Slack App.",
            "Supports op:// and env:// references.",
          ],
        },
      },
      {
        path: "appToken",
        label: "App Token",
        type: "password",
        required: true,
        secret: true,
        placeholder: "xapp-...",
        help: {
          title: "Slack App Token",
          lines: [
            "App-Level Token (xapp-...) with connections:write scope.",
            "Required for Socket Mode. Supports op:// and env:// references.",
          ],
        },
      },
    ],
    summary: (values) =>
      values.enabled === "true" ? (values.botToken ? "configured" : "enabled") : "",
  },
};

const whatsappChannel: ChannelDef = {
  name: "whatsapp",
  label: "WhatsApp",
  pluginName: "whatsapp",
  configDef: {
    sectionLabel: "WhatsApp",
    sectionHelp: {
      title: "WhatsApp",
      lines: [
        "Connect your agent to WhatsApp.",
        "No token needed — uses QR code pairing.",
        "After provisioning, pair via: clawctl oc -i <name> channels login --channel whatsapp",
      ],
    },
    fields: [enabledField],
    summary: (values) => (values.enabled === "true" ? "QR pairing" : ""),
  },
};

// ---------------------------------------------------------------------------
// Channel registry
// ---------------------------------------------------------------------------

/** All known channel definitions, keyed by channel name. */
export const CHANNEL_REGISTRY: Record<string, ChannelDef> = {
  telegram: telegramChannel,
  discord: discordChannel,
  slack: slackChannel,
  whatsapp: whatsappChannel,
};

/** Ordered list of channels for wizard display. */
export const CHANNEL_ORDER: string[] = ["telegram", "discord", "slack", "whatsapp"];

/**
 * Get secret field paths for a channel.
 * Returns paths of fields marked `secret: true` in the channel's configDef.
 */
export function getChannelSecretPaths(channelName: string): string[] {
  const def = CHANNEL_REGISTRY[channelName];
  if (!def) return [];
  return def.configDef.fields.filter((f) => f.secret).map((f) => f.path as string);
}
