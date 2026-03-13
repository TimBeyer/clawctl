<p align="center">
  <img src="docs/assets/clawctl.jpg" alt="clawctl">
</p>

<h1 align="center">clawctl</h1>

<p align="center">
  <strong>Run OpenClaw gateways in isolated VMs — managed entirely from your Mac.</strong><br>
  <em>You never touch the VM. Config lives on your host, git-tracked and reproducible.</em>
</p>

---

**clawctl gives each OpenClaw gateway its own isolated Ubuntu VM** via
[Lima](https://lima-vm.io), provisions it with everything OpenClaw needs, and
manages the full lifecycle from your Mac. You never shell in or piece together
scripts — just answer a few questions (or hand it a config file) and the
gateway is running. Config and data are mounted into a project directory on
your host, so they're editable, git-trackable, and safe from VM rebuilds.

> **Terminology**: A clawctl **instance** is a Lima VM running an OpenClaw
> **gateway**. The gateway hosts one or more **agents** — each with its own
> workspace, sessions, and tools. clawctl manages the instance lifecycle;
> OpenClaw manages the agents inside it.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash
```

To update an existing installation, run the same command again.

**Requires** macOS on Apple Silicon (M1/M2/M3/M4) with
[Homebrew](https://brew.sh) installed. Lima is installed automatically if not
already present.

## Quickstart

```bash
# Interactive wizard — answers a few questions, does everything else
clawctl create

# Headless — config-file-driven, no prompts, great for CI/CD
clawctl create --config config.json
```

## What you get

In about five minutes, the wizard gives you:

- A running OpenClaw gateway with a dashboard at `http://localhost:18789`
- An isolated Ubuntu 24.04 VM with Node.js, Tailscale, and the 1Password CLI pre-installed
- A project directory on your Mac with git-tracked config and persistent data that survives VM rebuilds

You just answer a few questions. clawctl handles prerequisites, VM creation,
provisioning, and — optionally — credential setup and OpenClaw onboarding.

## Features

- **Fully isolated** — each gateway runs in its own Ubuntu VM; nothing installed on your Mac
- **Zero VM wrangling** — interactive wizard or headless config file, no manual provisioning
- **Git-friendly** — config and data live in your project directory, not buried in a VM
- **Reproducible** — delete the VM, recreate it, pick up right where you left off
- **Secret management** — 1Password `op://` references and `env://` variables; zero plaintext secrets in config
- **Remote access** — optional Tailscale integration for accessing your gateway from anywhere
- **15+ AI providers** — Anthropic, OpenAI, Gemini, Mistral, and more out of the box
- **Run multiple gateways** — each instance gets its own isolated VM; spin up as many as you need
- **CI/CD ready** — [headless mode](docs/headless-mode.md) for fully automated provisioning

## Commands

| Command                                    | Description                                       |
| ------------------------------------------ | ------------------------------------------------- |
| `clawctl create`                           | Interactive wizard                                |
| `clawctl create --config <path>`           | Headless mode (config-file-driven)                |
| `clawctl list`                             | List all instances with live status               |
| `clawctl status [name]`                    | Detailed info for one instance                    |
| `clawctl start [name]`                     | Start a stopped instance                          |
| `clawctl stop [name]`                      | Stop a running instance                           |
| `clawctl restart [name]`                   | Stop + start + health checks                      |
| `clawctl delete [name] [--purge]`          | Delete VM; `--purge` also removes project dir     |
| `clawctl shell [name]`                     | Interactive shell into the VM                     |
| `clawctl shell [name] -- <cmd...>`         | Run a command in the VM                           |
| `clawctl openclaw <subcommand...>`         | Run an `openclaw` command in the VM (alias: `oc`) |
| `clawctl use [name] [--global]`            | Set or show the current instance context          |
| `clawctl register <name> --project <path>` | Register an existing (pre-registry) instance      |

All instance commands (`status`, `start`, `stop`, `restart`, `delete`, `shell`,
`openclaw`) accept an optional positional name, a `-i`/`--instance` flag, or
resolve the instance automatically via context. Run `clawctl --help` for
details.

### Instance context

You don't have to type the instance name every time. clawctl resolves the
target instance in this order:

1. `--instance` / `-i` flag — `clawctl status -i my-agent`
2. `CLAWCTL_INSTANCE` env var — `export CLAWCTL_INSTANCE=my-agent`
3. `.clawctl` file — walks up from your current directory (like `.nvmrc`)
4. Global context — `~/.config/clawctl/context.json`

Set context with `clawctl use`:

```bash
clawctl use my-agent            # write .clawctl in current directory
clawctl use my-agent --global   # set global default
clawctl use                     # show current context and its source
```

### Running openclaw commands from the host

No need to shell in for routine operations — `clawctl openclaw` (or `oc` for
short) runs any `openclaw` subcommand inside the VM:

```bash
clawctl oc doctor               # health check
clawctl oc config get gateway.name
clawctl oc daemon status
clawctl oc telegram list
```

For arbitrary commands, use `clawctl shell --`:

```bash
clawctl shell -- whoami
clawctl shell -- systemctl --user status openclaw-gateway
```

### Day-to-day management

clawctl isn't just an installer — it's how you manage your gateways after setup too.

```bash
# Set your default instance once
clawctl use my-agent

# See what's running
clawctl list

# Quick health check — no need to shell in
clawctl oc doctor

# Restart one that's acting up
clawctl restart

# Spin up a second gateway for a different project
clawctl create

# Tear it down when you're done (keeps your project dir by default)
clawctl delete my-agent
```

Instances are tracked in `~/.config/clawctl/instances.json` and registered
automatically on create, or manually via `clawctl register`. Run as many
gateways as your hardware allows — each gets its own isolated VM, project
directory, and config.

## Documentation

- [Getting Started](docs/getting-started.md) — guided walkthrough for first-time users
- [Headless Mode](docs/headless-mode.md) — config-file-driven provisioning for CI and scripted setups
- [Config Reference](docs/config-reference.md) — full schema for headless config files
- [1Password Setup](docs/1password-setup.md) — service accounts and `op://` secret references
- [Tailscale Setup](docs/tailscale-setup.md) — auth keys, ACLs, remote dashboard access
- [Snapshots and Rebuilds](docs/snapshots-and-rebuilds.md) — cloning VMs, data persistence, full rebuilds
- [Project Directory](docs/project-directory.md) — what the CLI creates and how to customize it
- [Troubleshooting](docs/troubleshooting.md) — common issues and fixes

## Contributing

```bash
bun bin/cli.tsx create                                     # run the wizard
bun bin/cli.tsx create --config examples/config.json       # headless mode
bun build ./bin/cli.tsx --compile --outfile dist/clawctl   # build binary
bun test                                                   # unit tests
bun run lint                                               # ESLint
bun run format:check                                       # Prettier check
```

To install to a custom directory, set `INSTALL_DIR`:

```bash
INSTALL_DIR=~/.local/bin curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash
```

See [Architecture](docs/architecture.md), [CLI Wizard Flow](docs/cli-wizard-flow.md),
[VM Provisioning](docs/vm-provisioning.md), and [Testing](docs/testing.md) for internals.

---

**Ready to go?**

```bash
curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash
clawctl create
```

Your gateway will be running in its own isolated VM in minutes.
