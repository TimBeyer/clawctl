import type { CapabilityDef } from "@clawctl/types";
import {
  provisionOpenclaw,
  provisionEnvVars,
  provisionNpmGlobalPath,
  provisionGatewayStub,
} from "./install.js";

export const openclaw: CapabilityDef = {
  name: "openclaw",
  label: "OpenClaw",
  version: "1.0.0",
  core: true,
  hooks: {
    "provision-openclaw": {
      execContext: "user",
      steps: [
        { name: "openclaw-install", label: "OpenClaw", run: (ctx) => provisionOpenclaw(ctx) },
        { name: "env-vars", label: "Environment variables", run: (ctx) => provisionEnvVars(ctx) },
        {
          name: "npm-global-path",
          label: "npm-global PATH",
          run: (ctx) => provisionNpmGlobalPath(ctx),
        },
        {
          name: "gateway-stub",
          label: "Gateway service stub",
          run: (ctx) => provisionGatewayStub(ctx),
        },
      ],
      doctorChecks: [
        {
          name: "path-openclaw",
          run: async (ctx) => ({
            passed: await ctx.commandExists("openclaw"),
            error: (await ctx.commandExists("openclaw")) ? undefined : "openclaw not found on PATH",
          }),
        },
        {
          name: "env-OPENCLAW_STATE_DIR",
          run: async () => {
            const value = process.env.OPENCLAW_STATE_DIR;
            return {
              passed: !!value,
              detail: value ?? undefined,
              error: value ? undefined : "OPENCLAW_STATE_DIR not set",
            };
          },
        },
        {
          name: "env-OPENCLAW_CONFIG_PATH",
          run: async () => {
            const value = process.env.OPENCLAW_CONFIG_PATH;
            return {
              passed: !!value,
              detail: value ?? undefined,
              error: value ? undefined : "OPENCLAW_CONFIG_PATH not set",
            };
          },
        },
      ],
    },
  },
};
