# Rename create-openclaw-vm → clawctl

## Status: Resolved

## Scope

Rename all references to `create-openclaw-vm` across the project to
`clawctl`. Does not rename the git repo or directory on disk — just the
package name, binary name, and all documentation references.

## Plan

1. Find all occurrences of `create-openclaw-vm`
2. Replace in source, config, and docs (skip historical task docs)
3. Regenerate lockfile
4. Verify build

## Steps

- [x] Replace in package.json (name, bin, build script)
- [x] Replace in src/steps/welcome.tsx (display name)
- [x] Replace in src/templates/lima-yaml.ts (generated comment)
- [x] Replace in CLAUDE.md (title, build command)
- [x] Replace in README.md (title, bunx command, build command)
- [x] Replace in TODO.md (instance registry path, upgrade command)
- [x] Replace in docs/architecture.md (description)
- [x] Replace in docs/snapshots-and-rebuilds.md (bunx command)
- [x] Regenerate bun.lock
- [x] Verify no stray references remain (only historical task doc)

## Notes

- Historical task doc (`tasks/2026-03-04_2315_initial-implementation/TASK.md`)
  left unchanged — it's a record of what was done at that time.
- The build fails with a pre-existing `react-devtools-core` resolution
  error in Ink — not related to the rename.
- The lockfile required `rm bun.lock && bun install` to pick up the name
  change — `bun install` alone didn't rewrite it.

## Outcome

All 15 occurrences across 9 files renamed to `clawctl`. Lockfile
regenerated. One historical reference left intentionally.
