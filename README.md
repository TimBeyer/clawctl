<p align="center">
  <img src="docs/assets/clawctl.jpg" alt="clawctl">
</p>

<h1 align="center">clawctl</h1>

<p align="center">
  <strong>Run OpenClaw gateways in isolated VMs — managed entirely from your Mac.</strong><br>
  <em>You never touch the VM. Config lives on your host, git-tracked and reproducible.</em>
</p>

<p align="center">
  <a href="docs/getting-started.md">Getting Started</a> &middot;
  <a href="docs/headless-mode.md">Headless Mode</a> &middot;
  <a href="docs/config-reference.md">Config Reference</a> &middot;
  <a href="docs/troubleshooting.md">Troubleshooting</a>
</p>

---

clawctl gives each OpenClaw gateway its own isolated Ubuntu VM via
[Lima](https://lima-vm.io), provisions it with everything OpenClaw needs, and
manages the full lifecycle from your Mac. Answer a few questions (or hand it a
config file) and the gateway is running — config and data mounted into a project
directory on your host, editable, git-trackable, and safe from VM rebuilds.

> [!NOTE]
> **Terminology**: A clawctl **instance** is a Lima VM running an OpenClaw
> **gateway**. The gateway hosts one or more **agents**. clawctl manages the
> instance lifecycle; OpenClaw manages the agents inside it.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash
```

Requires **macOS on Apple Silicon** (M1–M4) with [Homebrew](https://brew.sh).
Lima is installed automatically if not already present.

## Quickstart

```bash
clawctl create
```


<p align="center">
  <img src="docs/assets/demo.gif" alt="clawctl create wizard">
</p>

In about five minutes you get:

- A running OpenClaw gateway with a dashboard at `http://localhost:18789`
- An isolated Ubuntu 24.04 VM with Node.js, Tailscale, and 1Password CLI pre-installed
- A git-tracked project directory with persistent data that survives VM rebuilds

## Day-to-day usage

clawctl isn't just an installer — it's how you manage your gateways after
setup too.

```bash
# Set your default instance once
clawctl use my-agent

# See what's running
clawctl list

# Quick health check — no need to shell in
clawctl oc doctor

# Restart one that's acting up
clawctl restart

# Run any openclaw command from the host
clawctl oc config get gateway.name
clawctl oc daemon status

# Shell in when you need to
clawctl shell

# Spin up a second gateway for a different project
clawctl create
```

> [!TIP]
> You don't have to type the instance name every time. `clawctl use my-agent`
> sets context — after that, all commands resolve the target automatically.
> Context can also come from a `.clawctl` file (like `.nvmrc`), an env var, or
> a `--instance` flag. See [instance context](#instance-context) for the full
> resolution order.

## What makes this different

| | |
|---|---|
| **Fully isolated** | Each gateway runs in its own Ubuntu VM — nothing installed on your Mac beyond clawctl itself |
| **Zero VM wrangling** | Interactive wizard or headless config file. No manual provisioning, no pasting shell commands |
| **Git-friendly** | `clawctl.json` (sanitized, no secrets) and `data/` live in your project directory, not buried in a VM |
| **Reproducible** | Delete the VM and recreate it — persistent data survives on the host via virtiofs mounts |
| **Secrets done right** | 1Password `op://` references resolved inside the VM only, `env://` for CI, zero plaintext in config |
| **Remote access** | Optional Tailscale — `serve` for your tailnet, `funnel` for public access |
| **15+ AI providers** | Anthropic, OpenAI, Gemini, Mistral, and more. Custom/self-hosted endpoints supported |
| **Multi-gateway** | Run as many isolated instances as your hardware allows, each with its own VM and config |

---

## Commands

<details open>
<summary><strong>Lifecycle</strong></summary>

| Command | Description |
|---|---|
| `clawctl create` | Interactive wizard |
| `clawctl create --config <path>` | Config-driven with TUI progress |
| `clawctl create --config <path> --plain` | Plain log output (CI/automation) |
| `clawctl start [name]` | Start a stopped instance |
| `clawctl stop [name]` | Stop a running instance |
| `clawctl restart [name]` | Stop + start + health checks |
| `clawctl delete [name] [--purge]` | Delete VM; `--purge` also removes project dir |

</details>

<details>
<summary><strong>Inspect & interact</strong></summary>

| Command | Description |
|---|---|
| `clawctl list` | List all instances with live status |
| `clawctl status [name]` | Detailed info for one instance |
| `clawctl shell [name]` | Interactive shell into the VM |
| `clawctl shell [name] -- <cmd...>` | Run a command in the VM |
| `clawctl openclaw <subcommand...>` | Run an `openclaw` command in the VM (alias: `oc`) |

</details>

<details>
<summary><strong>Context & configuration</strong></summary>

| Command | Description |
|---|---|
| `clawctl use [name] [--global]` | Set or show the current instance context |
| `clawctl register <name> --project <path>` | Register an existing (pre-registry) instance |
| `clawctl completions <shell>` | Generate shell completion script (bash or zsh) |

</details>

All instance commands accept an optional positional name, a `-i`/`--instance`
flag, or resolve the instance automatically via context.

### Instance context

clawctl resolves the target instance in this order:

1. `--instance` / `-i` flag — `clawctl status -i my-agent`
2. `CLAWCTL_INSTANCE` env var — `export CLAWCTL_INSTANCE=my-agent`
3. `.clawctl` file — walks up from your current directory (like `.nvmrc`)
4. Global context — `~/.config/clawctl/context.json`

```bash
clawctl use my-agent            # write .clawctl in current directory
clawctl use my-agent --global   # set global default
clawctl use                     # show current context and its source
```

### Shell completions

Tab completion for commands, options, instance names, and openclaw subcommands:

```bash
# Bash — add to ~/.bashrc:
eval "$(clawctl completions bash)"

# Zsh — add to ~/.zshrc:
eval "$(clawctl completions zsh)"
```

<details>
<summary>How openclaw completions work</summary>

Completions for `clawctl oc <subcommand>` — including deep completion like
`oc config set <TAB>` — are fetched from the VM and cached locally. The cache
refreshes automatically. See [Shell Completions](docs/shell-completions.md) for
details.

</details>

## Documentation

| | |
|---|---|
| [Getting Started](docs/getting-started.md) | Guided walkthrough for first-time users |
| [Headless Mode](docs/headless-mode.md) | Config-file-driven provisioning for CI and scripted setups |
| [Config Reference](docs/config-reference.md) | Full schema for headless config files |
| [1Password Setup](docs/1password-setup.md) | Service accounts and `op://` secret references |
| [Tailscale Setup](docs/tailscale-setup.md) | Auth keys, ACLs, remote dashboard access |
| [Snapshots and Rebuilds](docs/snapshots-and-rebuilds.md) | Cloning VMs, data persistence, full rebuilds |
| [Project Directory](docs/project-directory.md) | What the CLI creates and how to customize it |
| [Shell Completions](docs/shell-completions.md) | Tab completion setup and cache mechanics |
| [Architecture](docs/architecture.md) | Internals, design decisions, component relationships |
| [Capabilities](docs/capabilities.md) | The capability extension system |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and fixes |

<details>
<summary><strong>Contributing</strong></summary>

```bash
bun packages/cli/bin/cli.tsx create                          # run the wizard
bun packages/cli/bin/cli.tsx create --config examples/config.json  # headless
bun build ./packages/cli/bin/cli.tsx --compile --outfile dist/clawctl  # build binary
bun run build:claw                                           # build guest CLI
bun test                                                     # unit tests
bun run lint                                                 # ESLint
bun run format:check                                         # Prettier check
```

See [Architecture](docs/architecture.md), [CLI Wizard Flow](docs/cli-wizard-flow.md),
[VM Provisioning](docs/vm-provisioning.md), and [Testing](docs/testing.md) for
internals.

To install to a custom directory:

```bash
INSTALL_DIR=~/.local/bin curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash
```

</details>

---

```bash
curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash && clawctl create
```
