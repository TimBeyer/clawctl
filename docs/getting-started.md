# Getting Started

This guide walks you through creating your first OpenClaw instance with
clawctl. By the end, you'll have a fully provisioned VM with OpenClaw running
and a dashboard accessible from your browser.

## What you'll end up with

- An Ubuntu 24.04 VM running on your Mac via Lima
- OpenClaw installed, configured, and running inside the VM
- A dashboard at `http://localhost:18789`
- A project directory on your Mac with the instance config and persistent data
- The VM managed by `clawctl` — start, stop, shell in, delete, all from the host

## Prerequisites

- **macOS** on **Apple Silicon** (M1/M2/M3/M4)
- **Homebrew** installed — [brew.sh](https://brew.sh)
- **Bun** installed — `brew install oven-sh/bun/bun`

Lima is installed automatically by the wizard if not already present.

## Running the wizard

```bash
clawctl create
```

The wizard walks through 8 steps:

### 1. Prerequisite check

Verifies macOS, Homebrew, and Lima are available. If Lima is missing, the
wizard installs it via Homebrew automatically.

### 2. Configure

Prompts for VM settings — each has a sensible default you can accept by
pressing Enter:

| Setting           | Default                   |
| ----------------- | ------------------------- |
| Project directory | `~/openclaw-vms/my-agent` |
| VM name           | `openclaw`                |
| CPUs              | `4`                       |
| Memory            | `8GiB`                    |
| Disk              | `50GiB`                   |

### 3. Host setup

Installs Lima if it wasn't already present (skipped otherwise).

### 4. Create VM

Generates the Lima configuration, creates and boots the VM, and runs
provisioning scripts inside it. This step downloads the Ubuntu image on first
run, so it may take a few minutes.

### 5. Verify provisioning

Confirms that Node.js 22, Tailscale, Homebrew, and the 1Password CLI were
installed correctly inside the VM.

### 6. Credentials

Optional setup for two integrations:

- **1Password** — provide a service account token to enable `op://` secret
  references. See [1Password Setup](1password-setup.md).
- **Tailscale** — connect the VM to your tailnet for remote dashboard access.
  See [Tailscale Setup](tailscale-setup.md).

Both can be skipped and configured later.

### 7. OpenClaw onboarding

Runs OpenClaw's own onboarding wizard inside the VM. This configures your
model provider, installs the daemon, and sets up the gateway. You interact
with OpenClaw's prompts directly — the clawctl UI steps aside temporarily.

You can skip this and run `openclaw onboard` manually in the VM later.

### 8. Done

Shows a summary with your dashboard URL and useful commands.

## What it creates

The wizard creates two things:

**A Lima VM** — managed by `limactl` under `~/.lima/<vmName>/`. Contains the
Ubuntu guest OS, installed tools, and OpenClaw installation.

**A project directory** — on your Mac at the path you chose in step 2:

```
<projectDir>/
  clawctl.json    Instance config (safe to commit, no secrets)
  data/           Persistent storage (survives VM rebuilds)
  .git/           Git repository
```

The `data/` directory is mounted into the VM as writable storage. Anything
the VM writes to `/mnt/project/data/` persists on your Mac and survives VM
deletion and recreation.

For details on the project directory structure, see
[Project Directory](project-directory.md).

## Instance registry

clawctl tracks all instances in `~/.config/clawctl/instances.json`. This
powers the management commands (`list`, `status`, `start`, `stop`, etc.).
Instances are registered automatically on create.

The project directory gets a `clawctl.json` — a sanitized copy of the config
with secrets stripped. It's safe to commit and serves as the version-controllable
recipe for the instance.

## Verifying it worked

```bash
# Check instance status
clawctl list

# Access the dashboard
open http://localhost:18789

# Shell into the VM
clawctl shell <vmName>

# Check OpenClaw inside the VM
openclaw doctor
```

## Next steps

- [Headless Mode](headless-mode.md) — automate instance creation with config files
- [1Password Setup](1password-setup.md) — manage secrets with `op://` references
- [Tailscale Setup](tailscale-setup.md) — access your dashboard from any device
- [Snapshots and Rebuilds](snapshots-and-rebuilds.md) — back up and restore VMs
- [Troubleshooting](troubleshooting.md) — common issues and fixes
