# Config-Driven Mode

`clawctl create --config <path>` runs the provisioning pipeline from a JSON
config file, skipping the interactive wizard. By default it shows the same
fullscreen TUI as the wizard — with stage progress, step history, and a live
log viewer.

For CI/CD or piped environments, add `--plain` for a simple streaming log.

## Modes

| Command | Output |
|---------|--------|
| `clawctl create` | Full interactive wizard |
| `clawctl create --config <path>` | TUI progress (stages, steps, logs) |
| `clawctl create --config <path> --plain` | Plain `[prefix] message` log lines |

The TUI mode uses the alternate screen buffer with Ctrl-C cleanup — same
behavior as the interactive wizard. The `--plain` mode writes directly to
stdout and is safe for non-TTY environments.

## When to use each mode

- **Interactive wizard** — first-time setup, exploring options
- **Config + TUI** — re-provisioning, team onboarding, watching progress
- **Config + `--plain`** — CI/CD pipelines, scripted setups, log files

## Pipeline

All three modes run the same provisioning stages:

1. **Check prerequisites** — macOS, Apple Silicon, Homebrew
2. **Install Lima** — via Homebrew, if not already present
3. **Create and provision VM** — generate lima.yaml, boot Ubuntu 24.04, run provisioning
4. **Verify installed tools** — Node.js 22, Tailscale, Homebrew, 1Password CLI
5. **Set up 1Password** — if `services.onePassword` is configured
6. **Resolve secrets** — if `op://` references are present in the config
7. **Connect Tailscale** — if `network.tailscale` is configured
8. **Bootstrap gateway** — if `provider` is configured (runs `openclaw onboard --non-interactive`)
9. **Register instance** — write `clawctl.json` and update the instance registry

Without a `provider` section, onboarding is skipped. Run `openclaw onboard`
in the VM when ready.

## Examples

**Minimal** — creates a VM, skips onboarding:

```json
{
  "name": "my-agent",
  "project": "~/openclaw-vms/my-agent"
}
```

**Bootstrap** — creates a VM with a fully working OpenClaw gateway:

```json
{
  "name": "my-agent",
  "project": "~/openclaw-vms/my-agent",
  "provider": {
    "type": "anthropic",
    "apiKey": "sk-ant-..."
  }
}
```

For the full schema and all available fields, see the
[Config Reference](config-reference.md).

## Tips for CI

### Use `--plain` for automation

CI environments typically don't have a TTY, so the TUI can't render. Use
`--plain` explicitly to get clean, parseable log output:

```bash
clawctl create --config ./vm-bootstrap.json --plain
```

### Use `env://` for secrets

Keep secrets out of config files by using `env://` references that resolve
from the environment at load time:

```json
{
  "provider": {
    "type": "anthropic",
    "apiKey": "env://ANTHROPIC_API_KEY"
  },
  "network": {
    "tailscale": {
      "authKey": "env://TAILSCALE_AUTH_KEY"
    }
  }
}
```

Set the environment variables in your CI runner's secret store. Bun auto-loads
`.env` files, so you can also use a `.env` file locally.

### Use `op://` for zero-plaintext secrets

When 1Password is configured, `op://` references are resolved inside the VM
via `op read`. The resolved values are held in memory only — never written to
disk. See [1Password Setup](1password-setup.md#secret-references-in-config-files).

### Exit codes

`clawctl create --config` exits with code 0 on success and non-zero on failure.
Each stage logs its outcome, so CI logs show exactly where a failure occurred.

### Combining with instance management

After headless create, use the management commands:

```bash
clawctl list                    # verify the instance is running
clawctl status my-agent         # detailed info
clawctl stop my-agent           # stop when done
clawctl delete my-agent         # clean up
clawctl delete my-agent --purge # clean up including project directory
```
