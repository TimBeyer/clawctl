# Tool Abstraction Layer for vm-cli

## Status: Resolved

## Scope

Introduce a `tools/` layer of typed wrappers — one module per system tool — that
encapsulates all interactions with external commands. Provision commands become thin
orchestrators that compose tool operations. Doctor uses the same wrappers for its checks.

**Not in scope**: changing exec.ts, output.ts, checkpoint.ts, or provision/index.ts.

## Plan

1. Create `tools/types.ts` with shared `ProvisionResult` interface
2. Create foundational tool modules: `fs.ts`, `curl.ts`, `shell-profile.ts`
3. Create system tool modules: `apt.ts`, `systemd.ts`, `node.ts`, `tailscale.ts`
4. Create user tool modules: `homebrew.ts`, `op-cli.ts`
5. Create `tools/openclaw.ts`
6. Rewrite `commands/provision/system.ts`, `tools.ts`, `openclaw.ts` as thin orchestrators
7. Rewrite `commands/doctor.ts` to use tool wrappers
8. Delete `commands/provision/helpers.ts`
9. Verify: lint, build, type-check

## Steps

- [x] Create tools/types.ts
- [x] Create tools/fs.ts
- [x] Create tools/curl.ts
- [x] Create tools/shell-profile.ts
- [x] Create tools/apt.ts
- [x] Create tools/systemd.ts
- [x] Create tools/node.ts
- [x] Create tools/tailscale.ts
- [x] Create tools/homebrew.ts
- [x] Create tools/op-cli.ts
- [x] Create tools/openclaw.ts
- [x] Rewrite commands/provision/system.ts
- [x] Rewrite commands/provision/tools.ts
- [x] Rewrite commands/provision/openclaw.ts
- [x] Rewrite commands/doctor.ts
- [x] Delete commands/provision/helpers.ts
- [x] Verify lint + build

## Notes

- Replacing three duplicated step interfaces (`SystemStep`, `ToolStep`, `OpenclawStep`)
  with a single `ProvisionResult` that uses `"installed" | "unchanged" | "failed"` —
  dropping the ambiguous `"already"` and `"configured"` values.
- Replace `exec("rm", ...)` with `fs/promises` `unlink`/`rm` where possible.
  Applied in: `curl.ts` (cleanup temp script), `homebrew.ts` (cleanup installer),
  `op-cli.ts` (cleanup zip/extracted dir, plus `rename`/`chmod` instead of `mv`/`chmod` via exec).
- Replace `awk` passwd parsing in systemd with pure TypeScript —
  reads `/etc/passwd`, splits by `:`, finds first UID >= 1000.
- Constants (URLs, versions) stay colocated in each tool module per project convention.
- `shell-profile.ts` adds a convenience `ensurePath()` that wraps the
  `export PATH="...":$PATH"` pattern — used by `commands/provision/tools.ts`.
- `doctor.ts` still imports `commandExists` from `exec.ts` for PATH checks,
  which is fine — `commandExists` stays in `exec.ts` per plan.

## Outcome

- Created 11 tool modules in `packages/vm-cli/src/tools/`
- Rewrote 3 provision commands as thin orchestrators (~30 lines each vs ~100+ before)
- Rewrote `doctor.ts` to use `systemd.isActive()` and `openclaw.doctor()` wrappers
- Deleted `commands/provision/helpers.ts`
- No raw `exec()` calls remain in `commands/` files
- All 244 tests pass, lint clean, binary compiles
- Known limitation: `ensurePath` always uses the literal string in the profile
  (e.g. `$HOME/.local/bin`) — no shell expansion at write time, which is correct
  for profile files
