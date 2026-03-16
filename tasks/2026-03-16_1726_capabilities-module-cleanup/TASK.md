# Capabilities Module Cleanup

## Status: Resolved

## Scope

After the capabilities refactoring, the `@clawctl/capabilities` package contains both
declarative capability definitions AND runtime infrastructure (runner, state tracking,
utilities). This task makes capabilities purely declarative — definitions only — and
moves runtime infra into `vm-cli`. Additionally removes dead pre-capability code from
`vm-cli/src/tools/` and fixes inconsistencies and minor bugs in capability definitions.

**Out of scope**: changing capability definition interfaces, adding new capabilities,
modifying host-core or cli packages.

## Plan

1. Move runtime infra from `capabilities/` → `vm-cli/` (runner, state, util)
2. Remove dead pre-capability code in vm-cli tools
3. Fix double `commandExists` calls in doctor checks
4. Normalize homebrew capability structure
5. Fix runner result tracking bug

## Steps

- [x] Step 1: Move runtime infra and update imports
- [x] Step 2: Remove dead pre-capability code
- [x] Step 3: Fix double commandExists calls
- [x] Step 4: Normalize homebrew capability structure
- [x] Step 5: Fix runner result tracking bug

## Notes

## Outcome

All 5 steps delivered as planned:

1. `@clawctl/capabilities` is now purely declarative — only exports the 6 capability definitions
2. Runner, state, util moved to `vm-cli/src/capabilities/` where they're consumed
3. Dead pre-capability code removed from `vm-cli/src/tools/` (openclaw, systemd, types)
4. 6 doctor checks no longer call `commandExists` twice
5. Homebrew `provisionShellProfile` moved to `install.ts`, hardcoded indent fixed
6. Runner result tracking uses index-based slicing instead of fragile name matching

All tests pass (265), lint clean, formatting clean, `claw` binary builds.
