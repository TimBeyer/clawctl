# Pluggable Capability Config

## Status: Resolved

## Scope

Make capabilities fully self-describing: config schema, TUI form fields,
sidebar help, secret marking — all declared in a single `configDef` on
`CapabilityDef`. Adding a new capability should require only the capability
module and one export line.

**In scope:**

- Unified `CapabilityConfigDef<T>` type with typed paths, Zod derivation
- Migrate tailscale + one-password to declare `configDef`
- Dynamic schema validation for capability config
- Dynamic TUI form rendering from `configDef`
- Config normalization (legacy bridge)
- Provisioning passthrough of full capability config
- Host-side setup hook registry

**Out of scope:**

- Making core config sections (provider, telegram, bootstrap) into capabilities
- Nested config objects (path infrastructure is in place, not exercised yet)

## Plan

1. Phase 1: Types + unified config definitions
2. Phase 2: Config validation + flow
3. Phase 3: Dynamic TUI form
4. Phase 4: Host-side setup hooks

See plan file: `~/.claude/plans/mellow-tinkering-diffie.md`

## Steps

- [x] Add config definition types to `packages/types/src/capability.ts`
- [x] Add Zod schema derivation utility
- [x] Migrate tailscale capability to declare `configDef`
- [x] Migrate one-password capability to declare `configDef`
- [x] Add `ALL_CAPABILITIES` list export
- [x] Wire capability schema validation into `validateConfig`
- [x] Add config normalization (legacy bridge)
- [x] Update provisioning to pass full capability config
- [x] Update capability secret sanitization
- [x] Create `DynamicCapabilitySection` component
- [x] Refactor ConfigBuilder for dynamic capability sections
- [x] Update sidebar for dynamic capability help
- [x] Update config-review for dynamic capability rows
- [x] Create host hook registry
- [x] Refactor headless.ts to use host hooks
- [x] Dynamic HeadlessStage in provision-monitor

## Notes

- Used `type` aliases (not `interface`) for capability config types because
  TypeScript interfaces don't satisfy the `Record<string, unknown>` constraint
  needed by the `CapabilityConfigDef<T>` generic.
- `defineCapabilityConfig<T>()` returns type-erased `CapabilityConfigDef` for
  storage — the generic validates paths at the definition site, then erases
  for `CapabilityDef[]` compatibility.
- The `configSchema?: any` field on CapabilityDef was replaced by `configDef`.
  Zod schemas are now derived from field definitions, not hand-written.
- Schema derivation placed in `host-core/schema-derive.ts` (not capabilities
  package) because capabilities should be pure definitions with no processing logic.
- Host-side hooks live in `host-core/capability-hooks.ts` (not on CapabilityDef)
  because they need VMDriver which is a host-only dependency.

## Outcome

All four phases implemented:

1. **Types**: `CapabilityConfigField`, `CapabilityConfigDef`, `ConfigPath`,
   `JsonPointer`, `defineCapabilityConfig<T>()`, `HostSetupResult`
2. **Validation**: `validateConfig` accepts optional capability schema,
   `normalizeConfig` bridges legacy config paths, `sanitizeConfig` strips
   capability secrets generically, `provisionVM` passes full config objects
3. **TUI**: `CapabilitySection` component renders any configDef dynamically,
   ConfigBuilder uses `capValues` state for capability fields, sidebar and
   config-review derive content from capability definitions
4. **Host hooks**: Registry pattern replaces hardcoded 1Password/Tailscale
   blocks in headless.ts, provision-monitor derives stages dynamically

Adding a new capability now requires: one module file (with configDef) + one
export line in capabilities/index.ts + one hook entry in capability-hooks.ts
(only if the capability needs host-side setup).
