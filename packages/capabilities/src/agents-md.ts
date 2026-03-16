/**
 * AGENTS.md managed section writer.
 *
 * Assembles the managed section from all enabled capability `agentsMdSection`
 * contributions plus core operational rules header.
 */

import { join } from "path";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import type { CapabilityDef, ProvisionContext } from "@clawctl/types";

const START_MARKER = "<!-- clawctl:managed:start -->";
const END_MARKER = "<!-- clawctl:managed:end -->";

const AGENTS_MD_PATH = join(PROJECT_MOUNT_POINT, "data", "workspace", "AGENTS.md");

/** Build the managed section from capability contributions. */
function buildManagedSection(capabilities: CapabilityDef[]): string {
  const sections = capabilities
    .filter((cap) => cap.agentsMdSection)
    .map((cap) => cap.agentsMdSection!);

  const lines = [
    START_MARKER,
    "## Operational Rules (managed by clawctl)",
    "",
    "> Do not edit this section — it is regenerated during provisioning.",
    "",
    ...sections.flatMap((s) => [s, ""]),
    END_MARKER,
  ];

  return lines.join("\n");
}

/**
 * Write the AGENTS.md managed section. Idempotent.
 *
 * - If AGENTS.md doesn't exist, creates it with just the managed section.
 * - If AGENTS.md exists but has no managed section, appends it.
 * - If AGENTS.md has an existing managed section, replaces it in-place.
 */
export async function writeAgentsMd(
  ctx: ProvisionContext,
  capabilities: CapabilityDef[],
): Promise<void> {
  const section = buildManagedSection(capabilities);
  let content: string;

  try {
    content = await ctx.fs.readFile(AGENTS_MD_PATH, "utf-8");
  } catch {
    // File doesn't exist — create with just the managed section
    await ctx.fs.writeFile(AGENTS_MD_PATH, section + "\n");
    ctx.log("AGENTS.md created with managed section");
    return;
  }

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing managed section
    const existing = content.slice(startIdx, endIdx + END_MARKER.length);
    if (existing === section) {
      ctx.log("AGENTS.md managed section already up to date");
      return;
    }
    const updated =
      content.slice(0, startIdx) + section + content.slice(endIdx + END_MARKER.length);
    await ctx.fs.writeFile(AGENTS_MD_PATH, updated);
    ctx.log("AGENTS.md managed section updated");
    return;
  }

  // No managed section — append
  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  await ctx.fs.writeFile(AGENTS_MD_PATH, content + separator + section + "\n");
  ctx.log("AGENTS.md managed section appended");
}
