# Host-side CLI proxy, shell pass-through, and instance context

## Status: Resolved

## Scope

Add three features:

1. **`clawctl openclaw <subcommand...>`** (alias: `oc`) — proxy openclaw commands in the VM
2. **`clawctl shell [-- <cmd...>]`** — run a command in the VM via `--`
3. **Instance context** — `--instance`/`-i` flag, env var, `.clawctl` file, global context

Migrate all instance commands from positional `<name>` to resolved context.

**Not in scope:** Changes to VMDriver, LimaDriver, or registry.ts.

## Plan

1. Create `src/lib/shell-quote.ts` + tests
2. Create `src/lib/instance-context.ts` + tests
3. Create `src/lib/require-instance.ts`
4. Create `src/commands/openclaw.ts`
5. Create `src/commands/use.ts`
6. Modify `src/commands/shell.ts` — add `--` pass-through via requireInstance
7. Modify other instance commands (start, stop, restart, delete, status) to use requireInstance
8. Update `src/commands/index.ts` with new exports
9. Restructure `bin/cli.tsx` — add `-i` flag, `openclaw`/`oc`, `use`, shell `--`

## Steps

- [x] Create shell-quote.ts
- [x] Create shell-quote.test.ts
- [x] Create instance-context.ts
- [x] Create instance-context.test.ts
- [x] Create require-instance.ts
- [x] Create commands/openclaw.ts
- [x] Create commands/use.ts
- [x] Modify commands/shell.ts
- [x] Modify commands/start.ts
- [x] Modify commands/stop.ts
- [x] Modify commands/restart.ts
- [x] Modify commands/delete.ts
- [x] Modify commands/status.ts
- [x] Update commands/index.ts
- [x] Modify bin/cli.tsx
- [x] Run tests

## Notes

- Used `entry.name` instead of the old `name` parameter in log messages for start/stop/restart,
  since the resolved name comes from the registry entry now.
- Commander's `passThroughOptions()` + third `command` argument in the action handler captures
  args after `--` for shell pass-through.
- The `openclaw` command uses `allowUnknownOption()` + `passThroughOptions()` so arbitrary
  openclaw subcommands and flags pass through without Commander rejecting them.

## Outcome

All three features implemented as planned:
1. `clawctl openclaw` / `clawctl oc` — proxies openclaw commands into the VM
2. `clawctl shell -- <cmd>` — runs a command in the VM
3. Instance context with 4-level resolution (flag → env → .clawctl → global)

All instance commands (status, start, stop, restart, delete, shell) migrated from
positional `<name>` to optional `[name]` with `-i`/`--instance` flag support.

Added `clawctl use` for setting/showing context.

269 tests pass, lint and formatting clean. No changes to VMDriver, LimaDriver, or registry.ts.
