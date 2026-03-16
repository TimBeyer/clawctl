import dedent from "dedent";
import { join } from "path";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import type { CapabilityDef } from "@clawctl/types";

const SKILLS_DIR = join(PROJECT_MOUNT_POINT, "data", "workspace", "skills");

const CHECKPOINT_SKILL_CONTENT = dedent`
  ---
  name: checkpoint
  description: Save workspace changes to version control using claw checkpoint. Use after any write to memory, identity, skill, or workspace files. Think write then checkpoint then done.
  ---

  # Checkpoint

  \`claw checkpoint --message "reason"\` signals the host to commit your work
  to git. The host watches for checkpoint signals and runs \`git add data/ &&
  git commit\` — your workspace changes are version-controlled automatically.

  ## Habit

  Treat checkpoint as part of the write. Don't consider a task done until
  the checkpoint is made. Think: **write → checkpoint → done.**

  A small commit is always better than lost work.

  ## Triggers

  Checkpoint immediately after writing or editing any of these:

  - \`MEMORY.md\` or any file in \`data/workspace/memory/\`
  - \`SOUL.md\`, \`USER.md\`, \`IDENTITY.md\`
  - Any \`SKILL.md\` or file in \`data/workspace/skills/\`
  - Any file in \`data/workspace/\`
  - \`AGENTS.md\`, \`BOOTSTRAP.md\`

  Also checkpoint:

  - After completing a meaningful unit of work
  - Before long idle periods (end of session)
  - When in doubt — checkpoint

  ## When NOT to checkpoint

  - Mid-thought or mid-edit (finish the logical unit first)
  - After trivial whitespace or formatting-only edits
  - When work is incomplete and would leave files in a broken state

  ## Message guidelines

  Describe _what changed and why_, not generic "saving work":

  \`\`\`bash
  # Good
  claw checkpoint --message "updated SOUL.md with communication preferences"
  claw checkpoint --message "installed weather skill and configured API key"
  claw checkpoint --message "daily memory update — session notes for March 15"

  # Bad
  claw checkpoint --message "saving"
  claw checkpoint --message "checkpoint"
  claw checkpoint --message "updated files"
  \`\`\`

  ## What happens

  1. \`claw checkpoint\` writes a signal file to \`data/.checkpoint-request\`
  2. The host's \`clawctl watch\` detects the signal
  3. The host stages everything under \`data/\` and commits with your message
  4. The signal file is removed after a successful commit

  Everything under \`data/\` is committed: workspace files, config, state.
  The project directory is a single git repo — no nested repos.

  ## Structured output

  Use \`claw checkpoint --json\` for machine-readable output confirming the
  signal was written.

  ## Context

  \`claw\` is the VM-side management CLI. \`checkpoint\` is the primary
  agent-facing command. Other commands (\`provision\`, \`doctor\`) are
  infrastructure commands managed by the host — you won't need them.
`;

export const checkpoint: CapabilityDef = {
  name: "checkpoint",
  label: "Checkpoint",
  version: "1.0.0",
  core: true,
  hooks: {
    "provision-workspace": {
      execContext: "user",
      steps: [
        {
          name: "skill-checkpoint",
          label: "Checkpoint skill",
          run: async (ctx) => {
            try {
              const dir = join(SKILLS_DIR, "checkpoint");
              const path = join(dir, "SKILL.md");
              try {
                const existing = await ctx.fs.readFile(path, "utf-8");
                if (existing === CHECKPOINT_SKILL_CONTENT) {
                  ctx.log("checkpoint skill already installed");
                  return { name: "skill-checkpoint", status: "unchanged" };
                }
              } catch {
                // File doesn't exist — will create
              }
              await ctx.fs.mkdir(dir, { recursive: true });
              await ctx.fs.writeFile(path, CHECKPOINT_SKILL_CONTENT);
              ctx.log("checkpoint skill installed");
              return { name: "skill-checkpoint", status: "installed" };
            } catch (err) {
              return { name: "skill-checkpoint", status: "failed", error: String(err) };
            }
          },
        },
        {
          name: "agents-md-checkpoint",
          label: "AGENTS.md checkpoint section",
          run: async (ctx) => {
            try {
              await ctx.agentsMd.update(
                "checkpoint",
                dedent`
                  ### Checkpoint after writes

                  Every write to a workspace file must be followed by a checkpoint.
                  Think: **write → checkpoint → done.**

                  Checkpoint immediately after editing any of these:
                  - Memory files: \`MEMORY.md\`, files in \`memory/\`
                  - Identity files: \`SOUL.md\`, \`USER.md\`, \`IDENTITY.md\`
                  - Skills: any \`SKILL.md\` or file in \`skills/\`
                  - This file: \`AGENTS.md\`

                  When in doubt, checkpoint. A small commit is better than lost work.
                  See the **checkpoint** skill for usage details.
                `,
              );
              return { name: "agents-md-checkpoint", status: "installed" };
            } catch (err) {
              return { name: "agents-md-checkpoint", status: "failed", error: String(err) };
            }
          },
        },
      ],
    },
  },
};
