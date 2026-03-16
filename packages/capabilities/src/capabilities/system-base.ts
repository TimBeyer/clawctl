import type { CapabilityDef } from "@clawctl/types";
import { ensure as aptEnsure } from "../helpers/apt.js";
import { provision as nodeProvision } from "../helpers/node.js";
import { provisionLinger } from "../helpers/systemd.js";

const APT_PACKAGES = ["build-essential", "git", "curl", "unzip", "jq", "ca-certificates", "gnupg"];

export const systemBase: CapabilityDef = {
  name: "system-base",
  label: "System base",
  version: "1.0.0",
  core: true,
  hooks: {
    "provision-system": {
      execContext: "root",
      steps: [
        {
          name: "apt-packages",
          label: "APT packages",
          run: (ctx) => aptEnsure(ctx, APT_PACKAGES),
        },
        { name: "nodejs", label: "Node.js", run: (ctx) => nodeProvision(ctx) },
        { name: "systemd-linger", label: "systemd linger", run: (ctx) => provisionLinger(ctx) },
      ],
      doctorChecks: [
        {
          name: "path-claw",
          availableAfter: "vm-created",
          run: async (ctx) => ({
            passed: await ctx.commandExists("claw"),
            error: (await ctx.commandExists("claw")) ? undefined : "claw not found on PATH",
          }),
        },
        {
          name: "path-node",
          run: async (ctx) => ({
            passed: await ctx.commandExists("node"),
            error: (await ctx.commandExists("node")) ? undefined : "node not found on PATH",
          }),
        },
      ],
    },
  },
};
