import dedent from "dedent";
import type { CapabilityDef } from "@clawctl/types";
import {
  provision as opCliProvision,
  provisionOpWrapper,
  provisionExecApprovals,
  isInstalled as opIsInstalled,
} from "../helpers/op-cli.js";
import { writeSkill, secretManagementSkillContent } from "../helpers/skills.js";

export const onePassword: CapabilityDef = {
  name: "one-password",
  label: "1Password",
  version: "1.0.0",
  core: false,
  dependsOn: ["homebrew"],
  enabled: (config) =>
    config.capabilities?.["one-password"] !== undefined || config.onePassword === true,
  hooks: {
    // Phase 1: Install the op CLI binary
    "provision-tools": {
      execContext: "user",
      steps: [{ name: "op-cli", label: "1Password CLI", run: (ctx) => opCliProvision(ctx) }],
      doctorChecks: [
        {
          name: "path-op",
          run: async (ctx) => ({
            passed: await ctx.commandExists("op"),
            error: (await ctx.commandExists("op")) ? undefined : "op not found on PATH",
          }),
        },
      ],
    },
    // Phase 2: Install wrapper, exec-approvals, and skills
    "provision-workspace": {
      execContext: "user",
      steps: [
        {
          name: "skill-secret-management",
          label: "Secret management skill",
          run: async (ctx) => {
            if (!(await opIsInstalled(ctx))) {
              return {
                name: "skill-secret-management",
                status: "unchanged" as const,
                detail: "op not installed",
              };
            }
            return writeSkill(ctx, "secret-management", secretManagementSkillContent());
          },
        },
        {
          name: "op-wrapper",
          label: "1Password CLI wrapper",
          run: (ctx) => provisionOpWrapper(ctx),
        },
        {
          name: "exec-approvals",
          label: "Exec approvals",
          run: (ctx) => provisionExecApprovals(ctx),
        },
      ],
    },
  },
  agentsMdSection: dedent`
    ### 1Password secret management

    The \`op\` CLI is available with a pre-configured service account.
    Use it to read, create, and inject secrets. See the **secret-management**
    skill for usage details.
  `,
};
