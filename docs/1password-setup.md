# 1Password Setup

The OpenClaw VM uses a 1Password service account to access credentials without interactive sign-in. This guide walks through creating the account, vault, and token.

## Prerequisites

- A 1Password account (Business or Teams plan -- service accounts are not available on individual plans)
- Admin access to create vaults and service accounts

## Step 1: Create a Vault

Create a dedicated vault for OpenClaw credentials. Keeping them separate from personal vaults limits the blast radius if a token is compromised.

1. Open 1Password in the browser or desktop app.
2. Go to **Vaults** and click **New Vault**.
3. Name it something like `OpenClaw` or `OpenClaw-<environment>`.
4. Add any secrets your OpenClaw instance needs (API keys, database credentials, etc.).

## Step 2: Create a Service Account

Service accounts provide non-interactive access to 1Password vaults via the CLI.

1. Go to **Developer** > **Infrastructure Secrets** > **Service Accounts** in your 1Password admin console.
2. Click **Create Service Account**.
3. Name it (e.g., `openclaw-vm`).
4. Under **Vault Access**, grant access to only the vault you created in Step 1. Do not grant access to other vaults.
5. Set permissions to **Read Items** (write access is not needed for retrieving secrets).
6. Click **Save** and copy the generated token. This is your `OP_SERVICE_ACCOUNT_TOKEN`.

The token starts with `ops_` and is a long base64-encoded string. You will not be able to see it again after closing the dialog.

## Step 3: Provide the Token to the CLI

During the wizard's Credentials step (Step 6), you will be prompted:

```
? Set up 1Password now? [Y/n]
? OP_SERVICE_ACCOUNT_TOKEN: ****
```

The CLI validates the token by running `op whoami` inside the VM. On success, it:

1. Stores the token at `~/.openclaw/credentials/op-token` inside the VM with `chmod 600`.
2. Appends `export OP_SERVICE_ACCOUNT_TOKEN="<token>"` to `~/.bashrc` inside the VM.

If you skip this step during the wizard, you can configure it manually later:

```bash
limactl shell <vmName>
mkdir -p ~/.openclaw/credentials
echo 'ops_your_token_here' > ~/.openclaw/credentials/op-token
chmod 600 ~/.openclaw/credentials/op-token
echo 'export OP_SERVICE_ACCOUNT_TOKEN="ops_your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

## Using 1Password in the VM

### op run

The recommended way to inject secrets into processes is `op run`, which sets environment variables from 1Password references:

```bash
# .env file with op:// references
DATABASE_URL=op://OpenClaw/database/url
API_KEY=op://OpenClaw/api-service/credential

# Run a command with secrets injected
op run --env-file .env -- node server.js
```

The format is `op://<vault>/<item>/<field>`.

### Direct reads

```bash
# Read a specific field
op read "op://OpenClaw/database/url"

# Read as JSON
op item get "database" --vault "OpenClaw" --format json
```

### op:// References

The `op://` URI scheme follows this pattern:

```
op://<vault-name>/<item-name>/<field-name>
op://<vault-name>/<item-name>/<section-name>/<field-name>
```

Field names are case-insensitive. If a field name has spaces, use the field's label as shown in 1Password.

## Security Best Practices

### Token storage

- The token file at `~/.openclaw/credentials/op-token` is set to `chmod 600` (owner read/write only).
- The `.gitignore` in the generated project excludes `*.token` and `.env` files.
- Never commit the `OP_SERVICE_ACCOUNT_TOKEN` to version control.

### Scope

- Grant the service account access to only the vault it needs.
- Use read-only permissions unless write access is specifically required.
- Create separate service accounts for separate environments (dev, staging, production).

### Token rotation

- Rotate the token periodically via the 1Password admin console.
- After rotating, update the token inside the VM:

```bash
limactl shell <vmName>
echo 'new_token' > ~/.openclaw/credentials/op-token
# Update .bashrc or re-run the credentials step
```

### Host isolation

The token only lives inside the VM. The host macOS machine does not have the token in its environment or filesystem (unless you put it there). The project directory mount at `/mnt/project` is read-only from the guest, so the VM cannot write the token to your host filesystem.

## Secret References in Config Files

Config files support `op://` and `env://` URI references so you never need
plaintext secrets in your config. This means configs can be committed to git.

### `env://` references

`env://VAR_NAME` resolves from the host's environment at config-load time.
Bun auto-loads `.env` files, so you can put the value there:

```bash
# .env (gitignored)
OP_SERVICE_ACCOUNT_TOKEN=ops_your_token_here
```

```json
{
  "services": {
    "onePassword": {
      "serviceAccountToken": "env://OP_SERVICE_ACCOUNT_TOKEN"
    }
  }
}
```

### `op://` references

`op://vault/item/field` references are resolved inside the VM via `op read`
after the 1Password service account is set up. The resolved values are held
in memory only -- never written to disk.

```json
{
  "services": {
    "onePassword": {
      "serviceAccountToken": "env://OP_SERVICE_ACCOUNT_TOKEN"
    }
  },
  "provider": {
    "type": "anthropic",
    "apiKey": "op://Infrastructure/Anthropic/api-key"
  },
  "telegram": {
    "botToken": "op://Infrastructure/Telegram/bot-token"
  }
}
```

Config files with `op://` references require `services.onePassword` to be
configured (validation will reject configs with `op://` refs but no 1Password
service account).

### Zero-plaintext bootstrap

When 1Password is configured, the bootstrap flow uses `--secret-input-mode ref`
during openclaw onboard. This tells openclaw to store SecretRefs (pointers to
secrets) instead of the plaintext values. After onboard, an exec secret
provider is registered so openclaw resolves secrets via `op read` at runtime.

The result: no plaintext secrets anywhere on disk -- not in the clawctl config,
not in openclaw's config, and not in any environment file.

### Custom skill

When 1Password is configured, a custom skill is installed at
`data/workspace/skills/secret-management/SKILL.md`. This teaches the
agent how to use the pre-configured `op` CLI for reading secrets, injecting
them into processes, and discovering vaults. It supersedes the built-in
1password skill (which requires interactive tmux-based auth).

### Op wrapper

OpenClaw's exec tool doesn't source `~/.profile`, so `OP_SERVICE_ACCOUNT_TOKEN`
is not available in the exec environment. To work around this, bootstrap installs
a wrapper script at `~/.local/bin/op` that reads the token from
`~/.openclaw/secrets/op-token` and execs the real binary (moved to
`~/.local/bin/.op-real`). The agent uses `op` normally — no tmux or manual
environment setup needed.

### Exec-approval gate

The `op` CLI is gated behind an exec-approval rule (`~/.openclaw/exec-approvals.json`).
The default policy is `ask: on-miss` — the user must approve the first `op`
invocation, then subsequent calls are allowed automatically. This ensures
credential access is an explicit opt-in at runtime, not just at setup time.

### Example config

See [`example-config.op.json`](../example-config.op.json) for a complete
example with zero plaintext secrets.
