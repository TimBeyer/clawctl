# Headless Mode

`clawctl create --config <path>` runs the full provisioning pipeline without
interactive prompts. Use it for CI/CD, scripted setups, or reproducible team
onboarding.

## When to use it

- **CI/CD pipelines** — spin up OpenClaw instances as part of automated workflows
- **Scripted setups** — provision multiple instances from a shell script
- **Team onboarding** — share a config file so teammates get identical environments
- **Reproducible rebuilds** — recreate a VM from a checked-in config

## Pipeline

The headless pipeline runs these stages in order:

1. **Load config** — read and validate the JSON config file
2. **Check prerequisites** — macOS, Apple Silicon, Homebrew
3. **Install Lima** — via Homebrew, if not already present
4. **Create and provision VM** — generate lima.yaml, boot Ubuntu 24.04, run provisioning scripts
5. **Verify installed tools** — Node.js 22, Tailscale, Homebrew, 1Password CLI
6. **Set up 1Password** — if `services.onePassword` is configured
7. **Connect Tailscale** — if `network.tailscale` is configured
8. **Bootstrap OpenClaw** — if `provider` is configured (runs `openclaw onboard --non-interactive`)
9. **Register instance** — write `clawctl.json` and update the instance registry

Progress is printed as `[prefix] message` lines — suitable for terminals and
CI logs.

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

**Bootstrap** — creates a VM with a fully working OpenClaw instance:

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
