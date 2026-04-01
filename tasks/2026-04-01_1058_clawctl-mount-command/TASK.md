# `clawctl mount` — Manage VM mount points after creation

## Status: In Progress

## Scope

Add a `clawctl mount` command with `list`, `add`, and `remove` subcommands to manage host→guest mounts on existing instances. Currently mounts can only be set at VM creation time.

Does NOT cover:

- Hot-adding mounts without restart (Lima limitation)
- Changing built-in mounts (project, data)

## Context

Mounts are configured at create time via `config.mounts` and baked into lima.yaml. After creation there's no clawctl-level way to add or remove mounts — the only option is manually editing `~/.lima/<vm>/lima.yaml` and restarting. This gap became apparent during a VM migration where mount paths needed updating.

Mount management belongs on the abstract `VMDriver` interface (not Lima-specific) since any future backend would need the same operations.

## Plan

### Approach

Extend `VMDriver` with `readMounts()` and `writeMounts()` methods. Implement for Lima by parsing/writing the lima.yaml at `~/.lima/<vm>/lima.yaml` (path discovered via `limactl list --json`). Build a CLI command that uses these methods and handles the restart cycle.

### Why this approach

- Keeps mount management backend-agnostic via the driver interface
- Reuses existing `MountSpec` type and `yaml` package
- Lima doesn't support hot-mount, so stop→edit→start is the only option
- Syncing `clawctl.json` ensures mounts survive full VM rebuilds

### Files to create/modify

| File                                      | Action                                        |
| ----------------------------------------- | --------------------------------------------- |
| `packages/host-core/src/drivers/types.ts` | Add `readMounts`, `writeMounts` to `VMDriver` |
| `packages/host-core/src/drivers/lima.ts`  | Implement mount methods                       |
| `packages/host-core/package.json`         | Add `yaml` dependency                         |
| `packages/cli/src/commands/mount.ts`      | **Create** — mount list/add/remove            |
| `packages/cli/src/commands/index.ts`      | Add mount exports                             |
| `packages/cli/bin/cli.tsx`                | Wire mount subcommands                        |

## Steps

- [x] Delete one-off adopt script
- [ ] Add `readMounts`/`writeMounts` to `VMDriver` interface, implement for Lima
- [ ] Create `mount.ts` command (list/add/remove with restart flow + clawctl.json sync)
- [ ] Wire into CLI (commander definitions + exports)
- [ ] Lint, format, test
- [ ] Commit

## Notes

- Built-in mounts (`/mnt/project`, `/mnt/project/data`) are protected from removal
- Lima handles `~` expansion natively in mount locations — pass through as-is
- `clawctl.json` only stores user-added extra mounts, not the built-in ones
- The `yaml` package is already used in `@clawctl/templates`; added to `@clawctl/host-core` too
- The `runClawProvision` export added to host-core during the adoption work is kept — useful for future commands
