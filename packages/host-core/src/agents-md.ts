import dedent from "dedent";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { OnLine } from "./drivers/types.js";

const START_MARKER = "<!-- clawctl:managed:start -->";
const END_MARKER = "<!-- clawctl:managed:end -->";

/**
 * Build the managed section content.
 *
 * Rules here are cross-cutting operational behaviors that the agent should
 * internalize at session start. Skills contain the details; this section
 * provides the trigger so the agent knows *when* to consult a skill.
 */
function managedSectionContent(): string {
  return dedent`
    ${START_MARKER}
    ## Operational Rules (managed by clawctl)

    > Do not edit this section — it is regenerated during provisioning.

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
    ${END_MARKER}
  `;
}

/**
 * Ensure AGENTS.md contains the clawctl managed section.
 *
 * Called from the host after onboard + bootstrap populate AGENTS.md.
 * Operates on the host-side project directory (shared mount with VM).
 *
 * - If AGENTS.md doesn't exist, creates it with just the managed section.
 * - If AGENTS.md exists but has no managed section, appends it.
 * - If AGENTS.md has an existing managed section, replaces it in-place.
 *
 * Idempotent — no-ops if the section already matches.
 */
export async function patchAgentsMd(projectDir: string, onLine?: OnLine): Promise<void> {
  const agentsMdPath = join(projectDir, "data", "workspace", "AGENTS.md");
  const section = managedSectionContent();
  let content: string;

  try {
    content = await readFile(agentsMdPath, "utf-8");
  } catch {
    // File doesn't exist — create with just the managed section
    await writeFile(agentsMdPath, section + "\n");
    onLine?.("AGENTS.md created with managed section");
    return;
  }

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing managed section
    const existing = content.slice(startIdx, endIdx + END_MARKER.length);
    if (existing === section) {
      onLine?.("AGENTS.md managed section already up to date");
      return;
    }
    const updated =
      content.slice(0, startIdx) + section + content.slice(endIdx + END_MARKER.length);
    await writeFile(agentsMdPath, updated);
    onLine?.("AGENTS.md managed section updated");
    return;
  }

  // No managed section — append
  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  await writeFile(agentsMdPath, content + separator + section + "\n");
  onLine?.("AGENTS.md managed section appended");
}
