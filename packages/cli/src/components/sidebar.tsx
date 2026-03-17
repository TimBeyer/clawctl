import React from "react";
import { Text, Box } from "ink";

interface SidebarProps {
  title: string;
  lines: string[];
  width?: number;
}

export function Sidebar({ title, lines, width = 36 }: SidebarProps) {
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="gray" paddingX={1} width={width}>
      <Text bold color="cyan">
        {"\u2139"} {title}
      </Text>
      <Text> </Text>
      {lines.map((line, i) => (
        <Text key={i} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  );
}

export type SidebarContent = { title: string; lines: string[] };

/** Contextual help content keyed by focus ID. */
export const SIDEBAR_HELP: Record<string, SidebarContent> = {
  name: {
    title: "Instance Name",
    lines: [
      "Used as the VM name and the",
      "directory under project/ for",
      "gateway state.",
      "",
      "Must be a valid hostname:",
      "lowercase, hyphens, no spaces.",
      "",
      "Examples:",
      "  home-assistant",
      "  work-agent",
      "  dev-sandbox",
    ],
  },
  project: {
    title: "Project Directory",
    lines: [
      "Host directory for project files,",
      "config, and gateway state.",
      "",
      "Contains data/ (mounted into VM),",
      "clawctl.json, and .git.",
      "",
      "Supports ~ for home directory.",
    ],
  },
  resources: {
    title: "VM Resources",
    lines: [
      "CPU, memory, and disk allocation",
      "for the Lima VM.",
      "",
      "Defaults: 4 CPU, 8 GiB, 50 GiB",
      "",
      "For heavy workloads, consider:",
      "  8 CPU, 16 GiB, 100 GiB",
    ],
  },
  provider: {
    title: "Model Provider",
    lines: [
      "Required for full bootstrap.",
      "Skip to configure later with",
      "  clawctl oc onboard",
      "",
      "Provides the LLM backend for",
      "your agent. Choose from 14+",
      "supported providers.",
    ],
  },
  "provider.type": {
    title: "Provider Type",
    lines: [
      "Select your LLM provider.",
      "",
      "First-class support for:",
      "  anthropic, openai, gemini,",
      "  mistral, zai, moonshot,",
      "  huggingface, and more.",
      "",
      "Use 'custom' for self-hosted",
      "or unsupported providers.",
    ],
  },
  "provider.apiKey": {
    title: "API Key",
    lines: [
      "Your provider's API key.",
      "Required for all providers",
      "except 'custom'.",
      "",
      "Supports op:// references if",
      "1Password is configured.",
      "",
      "Never stored in clawctl.json",
      "(secrets are stripped).",
    ],
  },
  services: {
    title: "Services",
    lines: [
      "External service integrations.",
      "",
      "1Password: inject secrets via",
      "op:// references in your config.",
      "Requires a service account token.",
    ],
  },
  "services.opToken": {
    title: "1Password Token",
    lines: [
      "Service account token for",
      "1Password secret injection.",
      "",
      "Get one at:",
      "  my.1password.com/developer",
      "",
      "Enables op:// references in",
      "all config fields.",
    ],
  },
  network: {
    title: "Network",
    lines: [
      "Gateway port forwarding and",
      "Tailscale connectivity.",
      "",
      "Defaults:",
      "  Port 18789 forwarded",
      "  No Tailscale",
    ],
  },
  "network.tailscale": {
    title: "Tailscale Auth Key",
    lines: [
      "Pre-authenticated key for",
      "Tailscale network join.",
      "",
      "Generate at:",
      "  login.tailscale.com/admin",
      "  /settings/keys",
      "",
      "Enables remote access to",
      "your agent's dashboard.",
    ],
  },
  bootstrap: {
    title: "Agent Identity",
    lines: [
      "Give your agent a personality.",
      "This becomes the bootstrap",
      "prompt sent after setup.",
      "",
      "Agent context is freeform \u2014",
      "describe the creature, vibe,",
      "emoji, backstory, whatever",
      "makes your agent unique.",
      "",
      "User info helps the agent",
      "personalize interactions.",
    ],
  },
  telegram: {
    title: "Telegram",
    lines: [
      "Connect a Telegram bot for",
      "chat-based agent control.",
      "",
      "Requires a bot token from",
      "@BotFather on Telegram.",
      "",
      "allowFrom: Telegram user IDs",
      "groups: Group IDs + settings",
    ],
  },
  review: {
    title: "Review",
    lines: [
      "Review your configuration",
      "before creating the instance.",
      "",
      "Secrets are validated during",
      "provisioning (not here).",
      "",
      "Config will be saved to",
      "  <project>/clawctl.json",
    ],
  },
};
