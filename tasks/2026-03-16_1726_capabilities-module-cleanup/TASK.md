# Capabilities Module Cleanup

## Status: In Progress

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

- [ ] Step 1: Move runtime infra and update imports
- [ ] Step 2: Remove dead pre-capability code
- [ ] Step 3: Fix double commandExists calls
- [ ] Step 4: Normalize homebrew capability structure
- [ ] Step 5: Fix runner result tracking bug

## Notes

## Outcome
