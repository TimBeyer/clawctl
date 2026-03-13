# Host-side CLI proxy, shell pass-through, and instance context

## Status: In Progress

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

- [ ] Create shell-quote.ts
- [ ] Create shell-quote.test.ts
- [ ] Create instance-context.ts
- [ ] Create instance-context.test.ts
- [ ] Create require-instance.ts
- [ ] Create commands/openclaw.ts
- [ ] Create commands/use.ts
- [ ] Modify commands/shell.ts
- [ ] Modify commands/start.ts
- [ ] Modify commands/stop.ts
- [ ] Modify commands/restart.ts
- [ ] Modify commands/delete.ts
- [ ] Modify commands/status.ts
- [ ] Update commands/index.ts
- [ ] Modify bin/cli.tsx
- [ ] Run tests

## Notes
