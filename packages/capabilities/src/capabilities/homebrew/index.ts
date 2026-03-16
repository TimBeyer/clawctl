import type { CapabilityDef, ProvisionResult, CapabilityContext } from "@clawctl/types";
import { provisionHomebrew } from "./install.js";

async function provisionShellProfile(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    await ctx.profile.ensurePath("$HOME/.local/bin");
    ctx.log("      Shell profile configured");
    return { name: "shell-profile", status: "installed" };
  } catch (err) {
    return { name: "shell-profile", status: "failed", error: String(err) };
  }
}

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
