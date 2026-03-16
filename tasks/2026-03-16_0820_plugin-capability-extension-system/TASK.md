# Plugin/Capability Extension System

## Status: In Progress

## Scope

Refactor the hardcoded provisioning stages into a capability-focused extension system.
Each feature (1Password, Tailscale, etc.) becomes a self-contained, versioned capability
module with lifecycle hooks, sequential migrations, config schema contributions, and an
injected toolkit SDK.

**In scope:**
- New `@clawctl/capabilities` shared package with atomic capability definitions
- `ProvisionContext` SDK injected into all capability steps
- Multi-phase hooks with pre/main/post timing
- Sequential migrations (like DB migrations)
- Capability-contributed config schemas
- AGENTS.md patching moved VM-side
- Backwards-compatible config translation

**Out of scope:**
- Moving credential injection (setupOnePassword, setupTailscale) VM-side
- Moving bootstrap orchestration VM-side
- Wizard refactoring to use capability schemas (future task)
- External/third-party plugin support (internal-only for now)

## Plan

1. Define capability types in `@clawctl/types/src/capability.ts`
2. Create `@clawctl/capabilities` package:
   - Port tool wrapper logic into `helpers/` (parameterized with ProvisionContext)
   - Create capability modules in `capabilities/`
   - Registry, state tracking, runner, AGENTS.md writer
3. Wire VM-side: `createProvisionContext()`, update provision command + doctor
4. Wire host-side: provision config, headless, bootstrap, config schema
5. Delete old stage files and tool wrappers
6. Add tests, verify build

## Steps

- [ ] Create task directory + TASK.md
- [ ] Define capability types (`CapabilityDef`, `ProvisionContext`, etc.)
- [ ] Create `@clawctl/capabilities` package structure
- [ ] Port tool wrapper helpers (apt, node, systemd, homebrew, openclaw, etc.)
- [ ] Create capability modules (system-base, homebrew, openclaw, etc.)
- [ ] Create registry, state, runner, agents-md modules
- [ ] Wire VM-side (context.ts, provision/index.ts, doctor.ts)
- [ ] Wire host-side (provision.ts, headless.ts, bootstrap.ts, schemas)
- [ ] Delete old files
- [ ] Add tests
- [ ] Verify build + lint + format

## Notes

- The SDK context (`ProvisionContext`) is the true boundary between capability code
  and VM implementation. Capabilities use the SDK exclusively — no direct tool imports.
- Tool wrapper logic moves from `vm-cli/src/tools/` into `capabilities/helpers/`,
  parameterized with `ProvisionContext`.
- Capabilities are atomic — metadata + implementation live together in the shared package.
- Pre/post timing on hooks lets capabilities place steps semantically rather than gaming
  dependency ordering.

## Outcome

_(To be written when resolved)_
