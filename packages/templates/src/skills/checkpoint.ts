import dedent from "dedent";

/**
 * Generate a SKILL.md for the checkpoint system.
 *
 * Teaches the agent to use `claw checkpoint` to signal the host that
 * meaningful work has been done and should be committed to git.
 */
export function generateCheckpointSkill(): string {
  return dedent`
    ---
    name: checkpoint
    description: Save workspace changes to version control using claw checkpoint. Use after meaningful changes like memory updates, identity edits, skill modifications, or completing a task.
    ---

    # Checkpoint

    \`claw checkpoint --message "reason"\` signals the host to commit your work
    to git. The host watches for checkpoint signals and runs \`git add data/ &&
    git commit\` — your workspace changes are version-controlled automatically.

    ## When to checkpoint

    - After updating memory files (daily notes, MEMORY.md)
    - After modifying identity files (SOUL.md, USER.md, IDENTITY.md)
    - After installing or editing skills
    - After completing a meaningful unit of work
    - Before long idle periods (end of session)

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
}
