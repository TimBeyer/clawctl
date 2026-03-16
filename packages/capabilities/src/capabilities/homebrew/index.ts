import type { CapabilityDef } from "@clawctl/types";
import { provisionHomebrew, provisionShellProfile } from "./install.js";

export const homebrew: CapabilityDef = {
  name: "homebrew",
  label: "Homebrew",
  version: "1.0.0",
  core: true,
  hooks: {
    "provision-tools": {
      execContext: "user",
      steps: [
        { name: "homebrew", label: "Homebrew", run: (ctx) => provisionHomebrew(ctx) },
        { name: "shell-profile", label: "Shell profile", run: (ctx) => provisionShellProfile(ctx) },
      ],
      doctorChecks: [
        {
          name: "path-brew",
          run: async (ctx) => {
            const found = await ctx.commandExists("brew");
            return { passed: found, error: found ? undefined : "brew not found on PATH" };
          },
        },
      ],
    },
  },
};
