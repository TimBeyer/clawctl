# Docs Update: Post-Capabilities Refactoring + Agent Skills

## Status: Resolved

## Scope

Fix stale documentation references left over from the capabilities refactoring
(deleted `tools/` modules, old `stages.ts` pattern) and create Agent Skills
(`.agents/skills/`) for progressive discovery of developer docs.

Does NOT cover: changing any runtime code, modifying capabilities themselves,
or adding new capabilities.

## Plan

1. Fix stale docs in CLAUDE.md, architecture.md, vm-cli.md, vm-provisioning.md,
   project-directory.md, capabilities.md
2. Create `.agents/skills/` with four skills (symlinks to docs/)
3. Verify no stale references remain; validate formatting

## Steps

- [x] Update CLAUDE.md (six packages, capabilities package, rewrite claw conventions)
- [x] Update docs/architecture.md (directory tree, tool abstraction references)
- [x] Update docs/vm-cli.md (remove tool abstraction section, add system primitives)
- [x] Update docs/vm-provisioning.md (capabilities references, idempotency, 1Password path)
- [x] Update docs/project-directory.md (capability-state.json, provisioning section)
- [x] Update docs/capabilities.md (add Agent Skills section)
- [x] Create .agents/skills/ with four skill directories + SKILL.md + symlinks
- [x] Grep for stale references
- [x] Run format check
- [x] Fix bonus stale refs in docs/troubleshooting.md and docs/cli-wizard-flow.md

## Notes

- Also caught stale references in `docs/troubleshooting.md` (op-cli.ts path)
  and `docs/cli-wizard-flow.md` (homebrew.ts path) that weren't in the original
  plan. Fixed them since they were easy wins.

## Outcome

- Updated 8 docs files to replace all references to deleted tool modules,
  old stages pattern, and "five packages" with current capabilities-based
  architecture
- Added Agent Skills section to capabilities.md
- Created 4 Agent Skills in `.agents/skills/` with SKILL.md files following
  the Agent Skills spec, plus symlinks to canonical docs
- All formatting passes, no stale references remain in docs/
