import dedent from "dedent";
import type { CapabilityDef } from "@clawctl/types";
import { writeSkill, checkpointSkillContent } from "../helpers/skills.js";

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
          run: (ctx) => writeSkill(ctx, "checkpoint", checkpointSkillContent()),
        },
      ],
    },
  },
  agentsMdSection: dedent`
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
};
