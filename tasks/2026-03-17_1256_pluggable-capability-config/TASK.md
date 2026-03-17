# Pluggable Capability Config

## Status: In Progress

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

- [ ] Add config definition types to `packages/types/src/capability.ts`
- [ ] Add Zod schema derivation utility
- [ ] Migrate tailscale capability to declare `configDef`
- [ ] Migrate one-password capability to declare `configDef`
- [ ] Add `ALL_CAPABILITIES` list export
- [ ] Wire capability schema validation into `validateConfig`
- [ ] Add config normalization (legacy bridge)
- [ ] Update provisioning to pass full capability config
- [ ] Update capability secret sanitization
- [ ] Create `DynamicCapabilitySection` component
- [ ] Refactor ConfigBuilder for dynamic capability sections
- [ ] Update sidebar for dynamic capability help
- [ ] Update config-review for dynamic capability rows
- [ ] Create host hook registry
- [ ] Refactor headless.ts to use host hooks
- [ ] Dynamic HeadlessStage in provision-monitor

## Notes

## Outcome
