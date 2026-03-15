import dedent from "dedent";

/**
 * Generate a SKILL.md for the 1Password service account integration.
 *
 * This is the agent's credential tool — separate from infrastructure secrets
 * (API keys, bot tokens) which are managed by the file provider and are NOT
 * accessible to the agent.
 *
 * The agent's 1Password access is an explicit opt-in: sandbox OFF inherits
 * the token from the environment; sandbox ON requires explicit
 * `sandbox.docker.env: { OP_SERVICE_ACCOUNT_TOKEN }` configuration.
 */
export function generateSecretManagementSkill(): string {
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
