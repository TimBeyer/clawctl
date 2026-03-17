import dedent from "dedent";
import { join } from "path";
import { PROJECT_MOUNT_POINT, defineCapabilityConfig } from "@clawctl/types";
import type { CapabilityDef } from "@clawctl/types";
import {
  provisionOpCli,
  provisionOpWrapper,
  provisionExecApprovals,
  isOpInstalled,
} from "./op-cli.js";
import { secretManagementSkillContent } from "./skill.js";

const SKILLS_DIR = join(PROJECT_MOUNT_POINT, "data", "workspace", "skills");

interface OnePasswordConfig {
  serviceAccountToken: string;
}

export const onePassword: CapabilityDef = {
  name: "one-password",
  label: "1Password",
  version: "1.0.0",
  core: false,
  dependsOn: ["homebrew"],
  enabled: (config) =>
    config.capabilities?.["one-password"] !== undefined || config.onePassword === true,
  configDef: defineCapabilityConfig<OnePasswordConfig>({
    sectionLabel: "1Password",
    sectionHelp: {
      title: "1Password",
      lines: [
        "Inject secrets via op:// refs.",
        "Installs the op CLI and skills.",
        "",
        "Requires a service account token.",
      ],
    },
    fields: [
      {
        path: "serviceAccountToken",
        label: "SA Token",
        type: "password",
        required: true,
        secret: true,
        placeholder: "1Password service account token",
        help: {
          title: "1Password Token",
          lines: [
            "Service account token for the",
            "1Password CLI.",
            "",
            "Create one at:",
            "  my.1password.com/developer",
            "  /service-accounts",
          ],
        },
      },
    ],
    summary: (v) => (v.serviceAccountToken ? "1Password" : ""),
  }),
  hooks: {
    // Phase 1: Install the op CLI binary
    "provision-tools": {
      execContext: "user",
      steps: [{ name: "op-cli", label: "1Password CLI", run: (ctx) => provisionOpCli(ctx) }],
      doctorChecks: [
        {
          name: "path-op",
          run: async (ctx) => {
            const found = await ctx.commandExists("op");
            return { passed: found, error: found ? undefined : "op not found on PATH" };
          },
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
            if (!(await isOpInstalled(ctx))) {
              return {
                name: "skill-secret-management",
                status: "unchanged" as const,
                detail: "op not installed",
              };
            }
            const content = secretManagementSkillContent();
            const dir = join(SKILLS_DIR, "secret-management");
            const path = join(dir, "SKILL.md");
            try {
              const existing = await ctx.fs.readFile(path, "utf-8");
              if (existing === content) {
                ctx.log("secret-management skill already installed");
                return { name: "skill-secret-management", status: "unchanged" };
              }
            } catch {
              // File doesn't exist — will create
            }
            await ctx.fs.mkdir(dir, { recursive: true });
            await ctx.fs.writeFile(path, content);
            ctx.log("secret-management skill installed");
            return { name: "skill-secret-management", status: "installed" };
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
    // AGENTS.md must be written after openclaw onboard creates the base file
    bootstrap: {
      execContext: "user",
      steps: [
        {
          name: "agents-md-one-password",
          label: "AGENTS.md 1Password section",
          run: async (ctx) => {
            if (!(await isOpInstalled(ctx))) {
              return {
                name: "agents-md-one-password",
                status: "unchanged" as const,
                detail: "op not installed",
              };
            }
            await ctx.agentsMd.update(
              "one-password",
              dedent`
                ### 1Password secret management

                The \`op\` CLI is available with a pre-configured service account.
                Use it to read, create, and inject secrets. See the **secret-management**
                skill for usage details.
              `,
            );
            return { name: "agents-md-one-password", status: "installed" };
          },
        },
      ],
    },
  },
};
