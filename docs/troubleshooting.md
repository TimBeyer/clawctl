# Troubleshooting

Common issues and how to resolve them. For context-specific troubleshooting,
see also the inline sections in [VM Provisioning](vm-provisioning.md#troubleshooting)
and [Tailscale Setup](tailscale-setup.md#troubleshooting).

## Prerequisites

### "macOS not detected" or "Apple Silicon required"

clawctl requires macOS on Apple Silicon (M1/M2/M3/M4). It uses Lima with the
`vz` (Virtualization.framework) backend and arm64 Ubuntu images, which are
Apple Silicon–only.

### Homebrew not found

Install Homebrew from [brew.sh](https://brew.sh), then re-run the wizard.
Make sure `brew` is on your PATH — the wizard checks via `which brew`.

### Lima installation fails

If `brew install lima` fails, try:

```bash
brew update
brew install lima
```

If it still fails, check the [Lima GitHub issues](https://github.com/lima-vm/lima/issues)
for known problems with your macOS version.

## VM creation

### `limactl create` times out

The default timeout is 10 minutes. On first run, Lima downloads the Ubuntu
24.04 cloud image (~700 MB), which can be slow on constrained networks. Retry
— the image is cached after the first download.

### VM already exists

The wizard skips creation if a VM with the same name already exists. To start
fresh:

```bash
clawctl delete
clawctl create
```

### Disk space issues

The VM disk is thin-provisioned (grows on demand) but defaults to 50 GiB max.
Check host disk space with `df -h`. Check VM disk usage with:

```bash
limactl shell <vmName> -- df -h /
```

## Provisioning

### Node.js version mismatch

If the NodeSource setup script fails, the Ubuntu version may not be supported.
Ubuntu 24.04 is supported by NodeSource. Check inside the VM:

```bash
limactl shell <vmName> -- node --version
```

### Homebrew install hangs

The Homebrew installer downloads and compiles several packages. On first run
this can take several minutes. The `NONINTERACTIVE=1` flag ensures it does not
prompt — if it appears stuck, give it time.

### 1Password CLI version

The `op` version is pinned in `src/templates/installers/op-cli.ts`. To update,
change `OP_VERSION` there and recreate the VM.

### General provisioning failures

Provisioning scripts are idempotent. If a script fails partway through,
deleting and recreating the VM will re-run everything and skip already-completed
steps:

```bash
clawctl delete <vmName>
clawctl create --config <path>
```

Data in `<projectDir>/data/` is preserved across rebuilds.

## Tailscale

### `tailscale up` hangs

It may be waiting for browser authentication. For automated setups, use an auth
key:

```bash
sudo tailscale up --authkey=tskey-auth-xxxx --accept-dns=false
```

See [Tailscale Setup — Auth Keys](tailscale-setup.md#auth-keys) for how to
generate one.

### Cannot reach VM from other devices

Check `tailscale status` on both devices to confirm they are on the same
tailnet. If you use custom ACLs, ensure the gateway port (18789, or 443 for
serve mode) is allowed. See [Tailscale Setup — ACL Configuration](tailscale-setup.md#acl-configuration-for-dashboard-access).

### DNS not resolving inside the VM

The `--accept-dns=false` flag (recommended) prevents Tailscale from overriding
the VM's DNS. This means MagicDNS names won't resolve from inside the VM —
use Tailscale IPs instead, or use MagicDNS names only from external devices.

## OpenClaw onboarding

### Onboarding fails or hangs

If `openclaw onboard` fails during the wizard, the instance is still registered.
You can retry manually:

```bash
clawctl shell -- openclaw onboard --install-daemon
```

### Dashboard not accessible

If `http://localhost:18789` doesn't load after onboarding:

1. Check that the VM is running: `clawctl status`
2. Check that the daemon is running inside the VM:
   ```bash
   clawctl oc daemon status
   ```
3. Check port forwarding — the Lima config forwards guest port 18789 to the
   host. If you changed `gatewayPort`, use that port instead.
4. Check firewall settings on the host.

## Common patterns

### Full rebuild

When things are in a bad state, delete and recreate:

```bash
clawctl delete
clawctl create --config <projectDir>/clawctl.json
```

Data in `<projectDir>/data/` is preserved. Credentials stored inside the VM
(1Password token, Tailscale identity) will need to be reconfigured. See
[Snapshots and Rebuilds](snapshots-and-rebuilds.md) for details on what
persists.

### Snapshot before experimenting

Take a snapshot before making risky changes:

```bash
limactl stop <vmName>
limactl clone <vmName> <vmName>-snapshot-$(date +%Y%m%d)
limactl start <vmName>
```

See [Snapshots and Rebuilds](snapshots-and-rebuilds.md#snapshots-with-limactl-clone)
for restore instructions.
