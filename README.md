<p align="center">
  <img src="docs/assets/clawctl.jpg" alt="clawctl">
</p>

<h1 align="center">clawctl</h1>

<p align="center">
  <strong>Get an OpenClaw agent running in one command.</strong><br>
  <em>No SSH. No YAML wrestling. Just answer a few questions and you're live.</em>
</p>

---

**Setting up an OpenClaw agent shouldn't feel like a sysadmin exam.** clawctl
gets you from zero to a running agent in a single command — no manual
provisioning, no shelling into VMs, no piecing together scripts. Everything
lives in your project directory, version-controlled and reproducible.

Under the hood, clawctl spins up an isolated Ubuntu VM via
[Lima](https://lima-vm.io), provisions it with everything OpenClaw needs, and
mounts your project directory so config and data stay on your Mac — editable,
git-trackable, and safe from VM rebuilds.

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

- A running OpenClaw agent with a dashboard at `http://localhost:18789`
- An isolated Ubuntu 24.04 VM with Node.js, Tailscale, and the 1Password CLI pre-installed
- A project directory on your Mac with git-tracked config and persistent data that survives VM rebuilds

You just answer a few questions. clawctl handles prerequisites, VM creation,
provisioning, and — optionally — credential setup and OpenClaw onboarding.

## Features

- **One-command setup** — interactive wizard or headless config file, your choice
- **No SSH required** — everything is orchestrated from your Mac
- **Git-friendly** — config and data live in your project directory, not buried in a VM
- **Reproducible** — delete the VM, recreate it, pick up right where you left off
- **Secret management** — 1Password `op://` references and `env://` variables; zero plaintext secrets in config
- **Remote access** — optional Tailscale integration for accessing your agent from anywhere
- **15+ AI providers** — Anthropic, OpenAI, Gemini, Mistral, and more out of the box
- **Run multiple agents** — each instance gets its own isolated VM; spin up as many as you need
- **CI/CD ready** — [headless mode](docs/headless-mode.md) for fully automated provisioning

## Commands

| Command                                    | Description                                   |
| ------------------------------------------ | --------------------------------------------- |
| `clawctl create`                           | Interactive wizard                            |
| `clawctl create --config <path>`           | Headless mode (config-file-driven)            |
| `clawctl list`                             | List all instances with live status           |
| `clawctl status <name>`                    | Detailed info for one instance                |
| `clawctl start <name>`                     | Start a stopped instance                      |
| `clawctl stop <name>`                      | Stop a running instance                       |
| `clawctl restart <name>`                   | Stop + start + health checks                  |
| `clawctl delete <name> [--purge]`          | Delete VM; `--purge` also removes project dir |
| `clawctl shell <name>`                     | Shell into the VM                             |
| `clawctl register <name> --project <path>` | Register an existing (pre-registry) instance  |

Run `clawctl --help` for the full list.

### Day-to-day management

clawctl isn't just an installer — it's how you manage your agents after setup too.

```bash
# See what's running
clawctl list

# Spin up a second agent for a different project
clawctl create

# Restart one that's acting up
clawctl restart my-agent

# Tear it down when you're done (keeps your project dir by default)
clawctl delete my-agent
```

Instances are tracked in `~/.config/clawctl/instances.json` and registered
automatically on create, or manually via `clawctl register`. Run as many
agents as your hardware allows — each gets its own isolated VM, project
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

Your OpenClaw agent will be running in minutes.
