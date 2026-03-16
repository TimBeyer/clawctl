# Project Directory

When the CLI runs, it creates a project directory with everything needed to manage the VM. This document describes what is generated and how to customize it.

## Directory Structure

```
<projectDir>/
  clawctl.json                   Instance config (sanitized, no secrets)
  data/                          Writable persistent mount (survives VM rebuilds)
    capability-state.json        Tracks installed capability versions
  .git/                          Git repository
  .gitignore                     Ignores VM images, credentials, .DS_Store
```

## clawctl.json

A sanitized copy of the instance configuration, written after successful provisioning. Contains the instance name, project path, resource allocation, provider type (without API key), network settings (without tokens), and other non-secret configuration.

This file is safe to commit to git and serves as the version-controllable project recipe. Secrets (API keys, auth tokens, service account tokens) and one-time fields (bootstrap prompts) are stripped.

Example:

```json
{
  "name": "hal",
  "project": "~/openclaw-vms/hal",
  "resources": {
    "cpus": 4,
    "memory": "8GiB",
    "disk": "50GiB"
  },
  "provider": {
    "type": "anthropic",
    "model": "anthropic/claude-opus-4-6"
  }
}
```

## Lima Configuration

The `lima.yaml` VM definition is generated dynamically and passed to `limactl start` via a temp file. Lima stores its own copy at `~/.lima/<vmName>/lima.yaml`. The temp file is cleaned up after VM creation.

Key configuration:

```yaml
vmType: vz # Apple Virtualization.framework
os: Linux
arch: aarch64 # ARM64 for Apple Silicon

images:
  - location: "https://cloud-images.ubuntu.com/releases/24.04/release/..."
    arch: "aarch64"

cpus: 4 # From wizard or config
memory: "8GiB" # From wizard or config
disk: "50GiB" # From wizard or config

mountType: virtiofs
mounts:
  - location: "<projectDir>" # Read-only
    mountPoint: "/mnt/project"
    writable: false
  - location: "<projectDir>/data" # Writable
    mountPoint: "/mnt/project/data"
    writable: true

portForwards:
  - guestPort: 18789 # OpenClaw gateway
    hostPort: 18789
```

To change VM resources after creation, delete the VM and recreate it:

```bash
clawctl delete my-agent
clawctl create --config config.json
```

## Provisioning

Provisioning is handled by capabilities — self-contained modules that
declare what they install, when they run, and what health checks they
provide. The host deploys the `claw` binary into the VM and invokes
provisioning phases; capabilities do the work inside the VM.

Installed capability versions are tracked in `data/capability-state.json`.
To add new provisioning steps, write a `CapabilityDef` module. See
[capabilities.md](./capabilities.md) for the extension system and
[vm-provisioning.md](./vm-provisioning.md) for the provisioning sequence.

## data/

The writable persistent mount. Files written here from inside the VM (at `/mnt/project/data/`) are stored on the host at `<projectDir>/data/`.

Use this for anything that should survive VM deletion:

- Database files
- Application state
- Logs you want to keep

The `.gitignore` includes a comment showing how to optionally track `data/` in git.

## Git Workflow

The project directory is initialized as a git repository with an initial commit containing all generated files. The `.gitignore` excludes:

```
*.qcow2          # VM disk images
*.raw            # VM disk images
.env             # Environment files with secrets
*.token          # Token files
.DS_Store        # macOS metadata
```

### Recommended workflow

1. The CLI creates the initial commit with generated files.
2. Commit `clawctl.json` and any customizations.
3. If you share this project (e.g., team setup), others can clone it and use `clawctl create --config clawctl.json` to recreate the VM (they'll need to supply their own secrets).

```bash
cd <projectDir>
git add -A
git commit -m "feat: add PostgreSQL to provisioning"
```

### Sharing a VM configuration

The project directory contains `clawctl.json` with the non-secret configuration. A teammate can:

```bash
git clone <repo-url>
cd <project>
clawctl create --config clawctl.json
```

They will get an identical VM (minus secrets, which must be configured separately via `env://` or `op://` references).
