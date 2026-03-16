import type { CapabilityDef, ProvisionResult, ProvisionContext } from "@clawctl/types";
import { provision as homebrewProvision } from "../helpers/homebrew.js";

async function provisionShellProfile(ctx: ProvisionContext): Promise<ProvisionResult> {
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
        { name: "homebrew", label: "Homebrew", run: (ctx) => homebrewProvision(ctx) },
        { name: "shell-profile", label: "Shell profile", run: (ctx) => provisionShellProfile(ctx) },
      ],
      doctorChecks: [
        {
          name: "path-brew",
          run: async (ctx) => ({
            passed: await ctx.commandExists("brew"),
            error: (await ctx.commandExists("brew")) ? undefined : "brew not found on PATH",
          }),
        },
      ],
    },
  },
};
