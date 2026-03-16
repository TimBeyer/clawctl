# Docs Update: Post-Capabilities Refactoring + Agent Skills

## Status: In Progress

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

- [ ] Update CLAUDE.md (six packages, capabilities package, rewrite claw conventions)
- [ ] Update docs/architecture.md (directory tree, tool abstraction references)
- [ ] Update docs/vm-cli.md (remove tool abstraction section, add system primitives)
- [ ] Update docs/vm-provisioning.md (capabilities references, idempotency, 1Password path)
- [ ] Update docs/project-directory.md (capability-state.json, provisioning section)
- [ ] Update docs/capabilities.md (add Agent Skills section)
- [ ] Create .agents/skills/ with four skill directories + SKILL.md + symlinks
- [ ] Grep for stale references
- [ ] Run format check

## Notes

## Outcome
