# Restructure into Bun Workspaces Monorepo

## Status: In Progress

## Scope

Convert the single-package clawctl project into a Bun workspaces monorepo with
four packages: `@clawctl/types`, `@clawctl/templates`, `@clawctl/host-core`,
and `@clawctl/cli`. This creates clean boundaries before the VM CLI is added.

Does NOT include: creating the future `vm-core` or `vm-cli` packages.

## Plan

1. Scaffold workspace structure (dirs, package.json files, tsconfigs)
2. Extract `@clawctl/types` (pure types, schemas, constants, pure functions)
3. Extract `@clawctl/templates` (pure template generators)
4. Extract `@clawctl/host-core` (host-side VM management library)
5. Finalize `@clawctl/cli` (commands, UI, entry points)

## Steps

- [ ] Phase 1: Scaffold workspace structure
- [ ] Phase 2: Extract @clawctl/types
- [ ] Phase 3: Extract @clawctl/templates
- [ ] Phase 4: Extract @clawctl/host-core
- [ ] Phase 5: Finalize @clawctl/cli

## Notes

- Horizontal slicing chosen over vertical: host and VM CLIs share types/schemas
  but almost no runtime code.
- config.ts and secrets.ts need splitting: pure functions → types, I/O → host-core.
- Templates are almost entirely self-contained (only lima-yaml.ts imports types).

## Outcome

_To be written when resolved._
