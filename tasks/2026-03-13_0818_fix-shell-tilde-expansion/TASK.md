# Fix: `clawctl-dev shell` fails with `cd: ~: No such file or directory`

## Status: Resolved

## Scope

Fix the `shell()` method in `src/drivers/lima.ts` which passes a literal `~` to `limactl --workdir` via `execa`. Since `execa` bypasses the shell, the tilde is never expanded and limactl fails with `cd: ~: No such file or directory`.

Does not cover other uses of `--workdir` (the existing `exec` helper already uses `/tmp`).

## Plan

1. Query the VM's `$HOME` via the existing `exec` helper before launching the interactive shell
2. Use the resolved home directory as `--workdir` for the interactive `limactl shell` call

## Steps

- [x] Update `shell()` in `src/drivers/lima.ts` to resolve `$HOME` from the VM
- [x] Run `bun test` to verify no regressions (230 pass, 10 skip, 0 fail)

## Notes

- Can't just hardcode `/home/<user>` because the VM user may differ from the host user
- The existing `exec` helper already uses `--workdir /tmp`, so it's safe to use for the `$HOME` query
- Falling back to `/tmp` if `$HOME` resolution fails keeps the command functional

## Outcome

- `shell()` now queries `$HOME` from the VM before launching the interactive shell, avoiding the literal `~` issue
- No new imports or dependencies needed
- All existing tests pass
