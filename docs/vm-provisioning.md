# VM Provisioning

Provisioning installs all system packages, user tools, and OpenClaw
inside the VM. It's driven by the `claw` binary — a compiled TypeScript
CLI deployed into the VM during setup. The host CLI invokes it via
`driver.exec()` and gets structured JSON results back.

For the full architecture of the internal CLI and its tool abstraction
layer, see `docs/vm-cli.md`.

## Provisioning sequence

The host-side provisioning sequence (`host-core/src/provision.ts`):

1. Create project directory structure on the host
2. Initialize git repo
3. Create and start the Lima VM (or start it if it already exists)
4. Deploy the `claw` binary into the VM at `/usr/local/bin/claw`
5. `sudo claw provision system --json` — system packages (as root)
6. `claw provision tools --json` — user tools (as default user)
7. `claw provision openclaw --json` — OpenClaw and gateway stub

Each `claw provision` subcommand returns a JSON envelope with a list of
`ProvisionResult` steps. The host checks for failures and aborts if any
step has `status: "failed"`.

After provisioning, the host runs `claw doctor --json` to verify that
everything is installed and healthy.

## What each stage installs

### `provision system` (runs as root)

| Tool           | Method                   | Check                           |
| -------------- | ------------------------ | ------------------------------- |
| APT packages   | `apt-get install`        | `dpkg -l` per package           |
| Node.js 22     | NodeSource repo + apt    | `node --version` includes `v22` |
| systemd linger | `loginctl enable-linger` | linger file exists              |
| Tailscale      | Official install script  | `tailscale` on PATH             |

APT packages installed: `build-essential git curl unzip jq ca-certificates gnupg`.

### `provision tools` (runs as default user)

| Tool          | Method                       | Check                |
| ------------- | ---------------------------- | -------------------- |
| Homebrew      | Official install script      | `brew` on PATH       |
| 1Password CLI | Direct arm64 binary download | `op` on PATH         |
| Shell profile | Append to `~/.profile`       | Line present in file |

The 1Password CLI is installed as a direct binary download to
`~/.local/bin/op` because the 1Password apt repository does not publish
arm64 packages.

### `provision openclaw` (runs as default user)

| Tool                  | Method                      | Check                  |
| --------------------- | --------------------------- | ---------------------- |
| OpenClaw CLI          | `curl \| bash` installer    | `openclaw` on PATH     |
| Environment variables | Append to `~/.profile`      | Lines present in file  |
| npm-global PATH       | Append to `~/.profile`      | Line present in file   |
| Gateway service stub  | Write systemd unit + enable | `systemctl is-enabled` |

Environment variables set: `OPENCLAW_STATE_DIR` and
`OPENCLAW_CONFIG_PATH` both point to `/mnt/project/data/`.

The gateway service stub is a minimal systemd unit (`ExecStart=/bin/true`)
that gets replaced by the real service during OpenClaw's daemon install.
It's enabled but not started — `claw doctor` reports this as a warning,
not an error.

## Idempotency

Every tool module checks current state before acting:

- `apt.isInstalled(pkg)` checks `dpkg -l` before installing
- `node.isInstalled()` + `node.version()` checks before running NodeSource
- `homebrew.isInstalled()` checks before running the installer
- `systemd.isEnabled(service)` checks before writing the unit file
- `openclaw.isInstalled()` checks before running the installer

A provision function returns `{ status: "unchanged" }` if everything is
already in place, `{ status: "installed" }` if it made changes, or
`{ status: "failed" }` if something went wrong. Re-running provisioning
on an already-provisioned VM is a fast no-op.

## Verification (`claw doctor`)

After provisioning, the host runs `claw doctor --json --after provision-openclaw`
inside the VM. Each check declares `availableAfter` — the lifecycle
phase after which it should pass. The `--after` flag tells doctor which
phase has been reached. Checks whose `availableAfter` phase hasn't been
reached are warnings; all others are errors.

After provisioning (phase `provision-openclaw`), the gateway service and
openclaw doctor checks are warnings (they require the `bootstrap` phase),
while mounts, PATH entries, and environment variables are hard errors.

See the doctor checks table in `docs/vm-cli.md`.

## Re-running provisioning

Since provisioning is idempotent and the `claw` binary persists in the
VM, you can re-provision at any time:

```bash
# Re-run all stages
clawctl shell -- sudo claw provision system
clawctl shell -- claw provision tools
clawctl shell -- claw provision openclaw

# Check health
clawctl shell -- claw doctor
```

To fully rebuild from scratch:

```bash
clawctl delete <name> --purge
clawctl create --config <path>
```

Data in `<projectDir>/data/` is preserved across VM rebuilds (it lives
on the host and is mounted into the VM via virtiofs).

## Cleanup on failure

If provisioning fails (error or Ctrl+C), the host automatically cleans
up by deleting the VM and removing the project directory. This applies
to both the headless and interactive wizard paths. See
`host-core/src/cleanup.ts` for the implementation.

## Troubleshooting

**Node.js version mismatch**: If the NodeSource setup script fails,
check whether the Ubuntu version is supported. Ubuntu 24.04 is supported.

**Homebrew install hangs**: The Homebrew installer downloads and compiles
packages. On first run this can take several minutes.
`NONINTERACTIVE=1` ensures it does not prompt.

**1Password CLI version**: The version is pinned in
`packages/vm-cli/src/tools/op-cli.ts`. To update, change `OP_VERSION`
there, rebuild `claw`, and re-provision.

**Gateway service not active**: This is expected after provisioning.
The stub service runs `/bin/true` and exits immediately. The real
service is installed during the bootstrap/onboarding phase.
