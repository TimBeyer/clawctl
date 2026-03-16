# Capability Extension System — Boundary Refactor

## Status: In Progress

## Scope

Restructure the capabilities package to enforce clean separation of concerns
so the extension interface can evolve toward a proper plugin system.

**In scope:**
- Move registry (application wiring) from capabilities to vm-cli
- Promote apt + systemd to SDK context primitives
- Colocate capability-specific helpers (no shared helpers/ directory)
- Inline skill content in their capabilities
- Make AGENTS.md an SDK action (`ctx.agentsMd.update()`)
- Rename ProvisionContext → CapabilityContext
- Update runner to receive resolved hooks (decouple from registry)
- Delete stale task directory

**Out of scope:**
- Homebrew as a context-level SDK abstraction (future)
- Typed scope restriction for agentsMd per lifecycle phase (future)
- Third-party plugin loading (future)

## Plan

1. Delete stale task, create new task + commit
2. Type changes in @clawctl/types (rename, add facets, remove agentsMdSection)
3. Extract utility functions (basePhase, hookTiming) to capabilities/util.ts
4. Move registry to vm-cli/src/capabilities/registry.ts
5. Update context implementation (add apt, systemd, agentsMd)
6. Restructure capabilities as directories + colocate helpers
7. Update runner signature
8. Update vm-cli consumers (provision, doctor)
9. Update tests
10. Verify (tests, lint, format, build)

## Steps

- [ ] Delete stale task + commit task plan
- [ ] Type changes: ProvisionContext → CapabilityContext, add apt/systemd/agentsMd
- [ ] Extract basePhase/hookTiming to util.ts
- [ ] Move registry to vm-cli
- [ ] Update context implementation
- [ ] Restructure capabilities into directories
- [ ] Update runner signature
- [ ] Update vm-cli consumers
- [ ] Update tests
- [ ] Verify all checks pass

## Notes

- Design decision: apt and systemd on context because they're low-level system
  primitives every capability may need. Homebrew NOT on context because it's
  a capability that installs itself — capabilities that need `brew install`
  use `ctx.exec("brew", ["install", ...])`.
- agentsMd.update() replaces both the agentsMdSection field and the runner's
  post-workspace writeAgentsMd() call. Capabilities manage their own sections.
- Registry moves to vm-cli because the "which capabilities exist and which are
  enabled" question is application policy, not extension interface.
