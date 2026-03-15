# Restructure into Bun Workspaces Monorepo

## Status: Resolved

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

- [x] Phase 1: Scaffold workspace structure
- [x] Phase 2: Extract @clawctl/types
- [x] Phase 3: Extract @clawctl/templates
- [x] Phase 4: Extract @clawctl/host-core
- [x] Phase 5: Finalize @clawctl/cli

## Notes

- Horizontal slicing chosen over vertical: host and VM CLIs share types/schemas
  but almost no runtime code.
- config.ts and secrets.ts were split: pure functions (validateConfig,
  configToVMConfig, sanitizeConfig, findSecretRefs, hasOpRefs, resolveEnvRefs)
  → @clawctl/types; I/O functions (loadConfig, resolveOpRefs) → @clawctl/host-core.
- Templates are almost entirely self-contained (only lima-yaml.ts imports types).
- Migration used a shim strategy: each phase left re-export shims in the old
  locations so all consumers continued working. Shims were removed in the final
  cleanup step after all code was in packages/.
- Bun's workspace resolution + bundler moduleResolution worked seamlessly —
  no build step needed for internal packages.

## Outcome

Successfully restructured into four workspace packages with a strict DAG:
`types` ← `templates` ← `host-core` ← `cli`. All 280 tests pass, lint clean,
`bun build --compile` produces a working binary. CLAUDE.md updated with new
paths. The old `src/`, `bin/`, and `tests/` directories have been removed.

No functionality was deferred. The structure is ready for future `vm-core` and
`vm-cli` packages branching from `@clawctl/types`.
