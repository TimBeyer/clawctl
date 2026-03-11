# VM Provisioning

Provisioning scripts are generated from TypeScript templates in `src/templates/` and written directly into the VM at `/tmp/clawctl-provision/` via `shellExec` heredocs during bootstrap. They are ephemeral — cleaned up after provisioning completes.

## Script Execution Order

1. **`provision-system.sh`** -- runs as root (system-level packages)
2. **`provision-user.sh`** -- runs as the default user (user-level tools)

Both scripts source `helpers.sh` for shared idempotency functions.

## helpers.sh

Shared utility functions used by both provisioning scripts:

- **`command_exists <cmd>`** -- checks if a command is on PATH.
- **`ensure_apt_packages <pkg...>`** -- installs only missing packages. Checks each package with `dpkg -l` and batches the missing ones into a single `apt-get install`.
- **`ensure_in_bashrc <line>`** -- appends a line to `~/.bashrc` only if it is not already present (grep -qF).
- **`ensure_dir <path> [mode]`** -- creates a directory with the given permissions if it does not exist.

## provision-system.sh (root)

Runs with `set -euo pipefail`. Installs system-level dependencies.

### APT Packages

```
build-essential git curl unzip jq ca-certificates gnupg
```

These are the baseline packages needed for building native modules, fetching resources, and processing JSON.

### Node.js 22 via NodeSource

Checks if `node` exists and is version 22. If not:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
```

This adds the NodeSource apt repository and installs Node.js 22.x (includes npm).

### loginctl enable-linger

```bash
loginctl enable-linger "<username>"
```

Enables systemd user services to persist after the user logs out. This is required for OpenClaw's daemon process to keep running when you are not connected to the VM via `limactl shell`.

### Tailscale

Checks if `tailscale` is on PATH. If not:

```bash
curl -fsSL https://tailscale.com/install.sh | bash
```

Installs the Tailscale client and daemon. Does not run `tailscale up` -- that happens in the credentials step or manually later.

## provision-user.sh (user)

Runs with `set -euo pipefail` as the default Lima user.

### Homebrew (Linuxbrew)

Checks if `brew` is on PATH. If not:

```bash
NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Installs Homebrew to `/home/linuxbrew/.linuxbrew/`. Adds the `brew shellenv` eval to `~/.bashrc` for future sessions.

### 1Password CLI (arm64 binary)

Checks if `op` is on PATH. If not, downloads the arm64 Linux binary directly:

```bash
OP_VERSION="2.30.0"
curl -fsSL "https://cache.agilebits.com/dist/1P/op2/pkg/v${OP_VERSION}/op_linux_arm64_v${OP_VERSION}.zip" -o /tmp/op.zip
unzip -o /tmp/op.zip -d /tmp/op
mv /tmp/op/op ~/.local/bin/op
chmod +x ~/.local/bin/op
```

The binary is placed in `~/.local/bin/` rather than installed via apt or brew, since the 1Password apt repository does not publish arm64 packages.

### Shell Profile

Ensures `~/.local/bin` is on PATH by appending the export to `~/.bashrc` if not already present.

## Idempotency

Every installation step checks whether the tool is already present before attempting to install it. This means:

- Running the scripts a second time is a no-op if everything is already installed.
- If a script fails partway through, you can re-run it and it will skip already-completed steps.
- `ensure_apt_packages` only installs packages not already marked as installed by dpkg.
- `ensure_in_bashrc` only appends lines not already in the file.

## Re-running Provisioning

Provisioning scripts are ephemeral and not persisted on the host. To re-provision, delete and recreate the VM:

```bash
limactl stop <vmName>
limactl delete <vmName>
# Re-run clawctl to regenerate and provision
bun bin/cli.tsx create --config <path>
```

Since all provisioning scripts are idempotent, a fresh provision on a new VM is fast and reliable. Data in `<projectDir>/data/` is preserved across VM rebuilds.

## Troubleshooting

**Node.js version mismatch**: If the NodeSource setup script fails, check whether the Ubuntu version is supported. Ubuntu 24.04 is supported by NodeSource.

**Homebrew install hangs**: The Homebrew installer downloads and compiles several packages. On first run this can take several minutes. `NONINTERACTIVE=1` ensures it does not prompt.

**1Password CLI version**: The version is pinned to `2.30.0` in `src/templates/installers/op-cli.ts`. To update, change `OP_VERSION` there and recreate the VM.
