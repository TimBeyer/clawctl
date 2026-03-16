import type { CapabilityDef } from "@clawctl/types";
import { provision as tailscaleProvision } from "../helpers/tailscale.js";

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
      steps: [{ name: "tailscale", label: "Tailscale", run: (ctx) => tailscaleProvision(ctx) }],
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
