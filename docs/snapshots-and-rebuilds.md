# Snapshots and Rebuilds

## Snapshots with limactl clone

Lima supports cloning VMs with `limactl clone`. On macOS with APFS, clones use copy-on-write (CoW), meaning the clone initially takes almost no additional disk space -- only blocks that diverge between the original and the clone consume extra storage.

### Taking a Snapshot

```bash
limactl stop <vmName>
limactl clone <vmName> <vmName>-snapshot-$(date +%Y%m%d)
limactl start <vmName>
```

The VM must be stopped before cloning.

### When to Snapshot

Good times to take a snapshot:

- **After provisioning completes** -- before you start configuring the gateway. This gives you a clean baseline to return to.
- **Before experiments** -- trying a new configuration, upgrading packages, or testing destructive changes.
- **Before onboarding** -- a snapshot of the provisioned-but-not-onboarded VM lets you re-run `openclaw onboard` cleanly.

### Restoring from a Snapshot

To restore, delete the current VM and rename the snapshot:

```bash
limactl stop <vmName>
limactl delete <vmName>

# The snapshot becomes the primary
limactl stop <vmName>-snapshot-20260304
# Use limactl clone to rename it back
limactl clone <vmName>-snapshot-20260304 <vmName>
limactl start <vmName>
```

Or simply shell into the snapshot directly:

```bash
limactl start <vmName>-snapshot-20260304
limactl shell <vmName>-snapshot-20260304
```

### Listing Snapshots

```bash
limactl list
```

Shows all VMs including clones, with status and disk usage.

## Data Persistence

The generated project directory includes a `data/` folder that is mounted into the VM at `/mnt/project/data` as a **writable** virtiofs mount.

```
projectDir/
  clawctl.json       (instance config, safe to commit)
  data/              (writable in VM at /mnt/project/data/)
```

Files written to `/mnt/project/data/` inside the VM are stored on the host filesystem. This means:

- Data in `data/` survives VM deletion and recreation.
- Data in `data/` is not part of the VM disk image, so it is not included in `limactl clone` snapshots.
- You can back up `data/` independently.

Use this mount for anything that should persist across VM rebuilds: databases, configuration files, logs, etc.

## Full Rebuild

If the VM is in a bad state, you can delete it and recreate:

```bash
# Delete the VM (keeps project directory)
clawctl delete <vmName>

# Recreate from config
clawctl create --config <projectDir>/clawctl.json

# Or run the full wizard
clawctl create
```

The wizard checks for existing VMs and will skip creation if one with the same name exists. Delete first if you want a fresh start.

### What is preserved during a rebuild

- Everything in `projectDir/data/` (host filesystem).
- The `clawctl.json` in the project directory (host filesystem).
- The instance registry entry at `~/.config/clawctl/instances.json`.
- Git history in the project directory.

### What is lost during a rebuild

- The VM filesystem (anything written outside of `/mnt/project/data/`).
- Installed packages and modifications inside the VM.
- Credentials stored in `~/.openclaw/credentials/` inside the VM.
- Tailscale device identity (will register as a new device).

## Disk Usage

### VM disk image

The VM disk defaults to 50 GiB (configurable in the wizard). The actual file on disk grows as the VM uses space -- it is a sparse/thin-provisioned image.

Check usage from the host:

```bash
limactl list --json | jq '.dir' -r
# Then check the size of the directory
du -sh ~/.lima/<vmName>
```

### Clone disk usage

APFS CoW clones start at near-zero additional space. Over time, as the clone and original diverge, each will consume space proportional to their unique blocks. Two VMs that have diverged significantly will each use close to their full disk allocation.

### Cleanup

Remove VMs you no longer need:

```bash
# For registered instances
clawctl delete <vmName>

# For snapshots (not tracked by clawctl)
limactl stop <vmName>-old-snapshot
limactl delete <vmName>-old-snapshot
```

List all registered instances:

```bash
clawctl list
```

List all Lima VMs (including unregistered snapshots):

```bash
limactl list
```
