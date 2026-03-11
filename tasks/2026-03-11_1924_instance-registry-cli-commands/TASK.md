# Instance Registry & CLI Management Commands

## Status: Resolved

## Scope

Add persistent instance registry, `clawctl.json` project config, commander-based CLI dispatch, and lifecycle management commands (list, status, start, stop, restart, delete, shell, register).

Does NOT include: migration tooling for existing instances, config editing commands, or multi-driver support beyond Lima.

## Plan

1. Add commander dependency
2. Registry module (`src/lib/registry.ts` + tests)
3. Config sanitization (`sanitizeConfig` in `src/lib/config.ts` + tests)
4. `VMDriver.shell()` method on interface and Lima implementation
5. Stop writing `lima.yaml` to project dir (use tmpdir)
6. Update headless path to return `HeadlessResult` and write `clawctl.json`
7. Update wizard exit values (onboard, finish)
8. Command modules (`src/commands/`)
9. Rewrite `bin/cli.tsx` with commander
10. Verify `.gitignore` template

## Steps

- [x] Step 1: `bun add commander`
- [x] Step 2: Registry module + tests
- [x] Step 3: `sanitizeConfig` + tests
- [x] Step 4: `VMDriver.shell()` interface + Lima impl
- [x] Step 5: Lima `create()` writes to tmpdir
- [x] Step 6: Headless returns `HeadlessResult`, writes `clawctl.json`
- [x] Step 7: Wizard exit values (onboard projectDir, finish exit)
- [x] Step 8: Command modules
- [x] Step 9: Commander-based `bin/cli.tsx`
- [x] Step 10: Verify gitignore

## Notes

- Commander replaces the hand-rolled arg parsing; bare `clawctl` now shows help with exit 0.
- `lima.yaml` is written to `$TMPDIR` and cleaned up after `limactl start` succeeds (or fails). Lima keeps its own copy in `~/.lima/<name>/`.
- Finish component now calls `useApp().exit()` with a `FinishResult` so the wizard terminates cleanly even when onboarding is skipped.
- Registry uses atomic write-then-rename to prevent corruption.
- The `--help` flag on `register` shows `--project` as required, matching the plan.

## Outcome

Delivered all 10 commands from the plan. New files:

- `src/lib/registry.ts` + `src/lib/registry.test.ts` — persistent instance registry at `~/.config/clawctl/instances.json`
- `src/commands/` — all 10 command modules + barrel export
- Modified `bin/cli.tsx` — commander-based dispatch
- Modified `src/headless.ts` — returns `HeadlessResult`, writes `clawctl.json`
- Modified `src/drivers/types.ts` + `lima.ts` — `shell()` method, tmpdir for lima.yaml
- Modified `src/lib/config.ts` — `sanitizeConfig()`
- Modified `src/steps/onboard.tsx` — `projectDir` in `OnboardResult`
- Modified `src/steps/finish.tsx` — `FinishResult` + `exit()` call

All 224 tests pass, lint clean, format clean.
