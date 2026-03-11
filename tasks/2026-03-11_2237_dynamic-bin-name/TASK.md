# Dynamic executable name in CLI output

## Status: Resolved

## Scope

Make the CLI aware of how it was invoked (`clawctl` vs `clawctl-dev`) so
that every command it prints is directly copy-pasteable.

Does **not** cover: renaming the product, changing the compiled binary name,
or modifying test fixtures.

## Plan

1. Update `bin/clawctl-dev` to set `CLAWCTL_BIN=clawctl-dev` env var.
2. Create `src/lib/bin-name.ts` — reads `CLAWCTL_BIN` env var, defaults to `clawctl`.
3. Replace hardcoded `"clawctl"` in user-facing command output with the dynamic name.
4. Set Commander `.name()` from the same source.

## Steps

- [x] Update `bin/clawctl-dev` to export `CLAWCTL_BIN`
- [x] Create `src/lib/bin-name.ts`
- [x] Update `bin/cli.tsx` — use dynamic name for Commander
- [x] Update `src/commands/list.ts`
- [x] Update `src/commands/status.ts`
- [x] Update `src/commands/create.ts`
- [x] Update `src/headless.ts`
- [x] Verify output

## Notes

- Using an env var rather than inspecting `process.argv` because the shim runs
  `bun cli.tsx`, so argv[1] is always `cli.tsx` regardless of how the user
  invoked it. The env var lets the shim explicitly declare its identity.
- Default is `clawctl` which is correct for both the compiled binary and direct
  `bun bin/cli.tsx` invocation.

## Outcome

- `bin/clawctl-dev` now exports `CLAWCTL_BIN=clawctl-dev` before exec.
- `src/lib/bin-name.ts` provides `BIN_NAME` — reads the env var, defaults to `clawctl`.
- All user-facing command suggestions (list, status, create, headless) and
  Commander's `.name()` now use `BIN_NAME`.
- Verified: `bun bin/cli.tsx --help` shows `clawctl`, `./bin/clawctl-dev --help`
  shows `clawctl-dev`.
