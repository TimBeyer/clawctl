import type { CapabilityDef } from "@clawctl/types";

const TAILSCALE_INSTALL_URL = "https://tailscale.com/install.sh";

export const tailscale: CapabilityDef = {
  name: "tailscale",
  label: "Tailscale",
  version: "1.0.0",
  core: false,
  dependsOn: ["system-base"],
  enabled: (config) =>
    config.capabilities?.["tailscale"] !== undefined || config.tailscale === true,
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
          run: async (ctx) => ({
            passed: await ctx.commandExists("tailscale"),
            error: (await ctx.commandExists("tailscale"))
              ? undefined
              : "tailscale not found on PATH",
          }),
        },
      ],
    },
  },
};
