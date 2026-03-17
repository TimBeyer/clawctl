import { defineCapabilityConfig } from "@clawctl/types";
import type { CapabilityDef } from "@clawctl/types";

const TAILSCALE_INSTALL_URL = "https://tailscale.com/install.sh";

type TailscaleConfig = {
  authKey: string;
  mode?: "off" | "serve" | "funnel";
};

export const tailscale: CapabilityDef = {
  name: "tailscale",
  label: "Tailscale",
  version: "1.0.0",
  core: false,
  dependsOn: ["system-base"],
  enabled: (config) => config.capabilities?.["tailscale"] !== undefined,
  configDef: defineCapabilityConfig<TailscaleConfig>({
    sectionLabel: "Tailscale",
    sectionHelp: {
      title: "Tailscale",
      lines: [
        "Connect the VM to a Tailscale",
        "network for secure remote access.",
        "",
        "Requires a pre-authenticated key.",
      ],
    },
    fields: [
      {
        path: "authKey",
        label: "Auth Key",
        type: "password",
        required: true,
        secret: true,
        placeholder: "tskey-auth-...",
        help: {
          title: "Tailscale Auth Key",
          lines: [
            "Pre-authenticated key from your",
            "Tailscale admin panel.",
            "",
            "Generate at:",
            "  login.tailscale.com/admin",
            "  /settings/keys",
          ],
        },
      },
      {
        path: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "serve",
        options: [
          { label: "serve", value: "serve" },
          { label: "funnel", value: "funnel" },
          { label: "off", value: "off" },
        ],
        help: {
          title: "Tailscale Mode",
          lines: [
            "serve  — HTTPS on your tailnet",
            "funnel — public access via Tailscale",
            "off    — install but don't expose",
          ],
        },
      },
    ],
    summary: (v) => (v.authKey ? `Tailscale (${v.mode ?? "serve"})` : ""),
  }),
  hooks: {
    "provision-system": {
      execContext: "root",
      steps: [
        {
          name: "tailscale",
          label: "Tailscale",
          run: async (ctx) => {
            try {
              if (await ctx.commandExists("tailscale")) {
                ctx.log("Tailscale already installed");
                return { name: "tailscale", status: "unchanged" };
              }
              ctx.log("Installing Tailscale...");
              await ctx.net.downloadAndRun(TAILSCALE_INSTALL_URL);
              ctx.log("Tailscale installed");
              return { name: "tailscale", status: "installed" };
            } catch (err) {
              return { name: "tailscale", status: "failed", error: String(err) };
            }
          },
        },
      ],
      doctorChecks: [
        {
          name: "path-tailscale",
          run: async (ctx) => {
            const found = await ctx.commandExists("tailscale");
            return { passed: found, error: found ? undefined : "tailscale not found on PATH" };
          },
        },
      ],
    },
  },
};
