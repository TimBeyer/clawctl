import dedent from "dedent";
import { join } from "path";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import type { ProvisionContext, ProvisionResult } from "@clawctl/types";

const SKILLS_DIR = join(PROJECT_MOUNT_POINT, "data", "workspace", "skills");

/** Write a SKILL.md file. Idempotent — skips if content matches. */
export async function writeSkill(
  ctx: ProvisionContext,
  name: string,
  content: string,
): Promise<ProvisionResult> {
  try {
    const dir = join(SKILLS_DIR, name);
    const path = join(dir, "SKILL.md");

    try {
      const existing = await ctx.fs.readFile(path, "utf-8");
      if (existing === content) {
        ctx.log(`${name} skill already installed`);
        return { name: `skill-${name}`, status: "unchanged" };
      }
    } catch {
      // File doesn't exist — will create
    }

    await ctx.fs.mkdir(dir, { recursive: true });
    await ctx.fs.writeFile(path, content);
    ctx.log(`${name} skill installed`);
    return { name: `skill-${name}`, status: "installed" };
  } catch (err) {
    return { name: `skill-${name}`, status: "failed", error: String(err) };
  }
}

export function checkpointSkillContent(): string {
  return dedent`
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
}

export function secretManagementSkillContent(): string {
  return dedent`
    ---
    name: secret-management
    description: Manage credentials and secrets via the 1Password CLI (op). Primary credential store for reading, creating, updating, and injecting secrets into running processes.
    compatibility: Requires the op CLI and OP_SERVICE_ACCOUNT_TOKEN in the environment.
    ---

    # 1Password Service Account

    The \`op\` CLI is available with a pre-configured service account. No signin
    or interactive authentication is needed — the service account token is
    already in the environment.

    This is YOUR credential store — use it to manage secrets for tasks you're
    working on. Infrastructure secrets (API keys, bot tokens that power your
    own runtime) are managed separately and are not accessible through this tool.

    ## Reading secrets

    \`\`\`bash
    # Read a specific secret field
    op read "op://vault-name/item-name/field-name"

    # Example
    op read "op://Infrastructure/Database/password"
    \`\`\`

    The format is \`op://vault/item/field\` or \`op://vault/item/section/field\`.

    ## Writing secrets

    \`\`\`bash
    # Create a new item
    op item create --vault "VaultName" --category login ${"\\"}
      --title "Service Credentials" ${"\\"}
      --url "https://example.com" ${"\\"}
      username="admin" ${"\\"}
      password="secret-value"

    # Update an existing field
    op item edit "ItemName" --vault "VaultName" ${"\\"}
      password="new-secret-value"
    \`\`\`

    Whether write operations work depends on the permissions configured for
    the service account. If writes fail with a permissions error, the service
    account may be configured as read-only.

    ## Injecting secrets into processes

    \`\`\`bash
    # Create an env file with op:// references
    cat > .env.op << 'EOF'
    DATABASE_URL=op://Infrastructure/Database/url
    API_KEY=op://Infrastructure/API/credential
    EOF

    # Run a command with secrets injected from 1Password
    op run --env-file .env.op -- node server.js
    \`\`\`

    ## Discovering vaults and items

    \`\`\`bash
    # List accessible vaults
    op vault list

    # List items in a vault
    op item list --vault "VaultName"

    # Get full item details as JSON
    op item get "ItemName" --vault "VaultName" --format json
    \`\`\`

    ## Important constraints

    - **Never expose secrets**: Do not log, print, echo, or write resolved
      secret values to files, stdout, or anywhere persistent. Use \`op run\` to
      inject them directly into process environments.
    - **This supersedes the built-in 1password skill**: Do not use
      interactive \`op signin\`, tmux-based auth flows, or desktop app
      integration. The service account token is injected automatically by
      the \`op\` wrapper — just run \`op\` commands directly.
    - **Exec approval**: The first \`op\` invocation requires user approval
      (exec-approval gate). Once approved, subsequent \`op\` commands run
      without prompting.
  `;
}
