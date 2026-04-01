# Generalized Channel Configuration + OpenClaw Passthrough

## Status: Resolved

## Scope

Introduce a data-driven `ChannelDef` system and an `openclaw` passthrough config key so users can configure any OpenClaw channel (and arbitrary OpenClaw settings) from their clawctl JSON config file.

**Covers:**
- `ChannelDef` type and registry (Telegram, Discord, Slack, WhatsApp)
- `channels` config key replacing top-level `telegram`
- `openclaw` passthrough config key for arbitrary OpenClaw settings
- Generic bootstrap loop for channel config application
- Wizard integration (dynamic channel sections)
- Secret handling generalization
- Backward compatibility for existing `telegram` configs

**Does not cover:**
- ChannelDefs for all 26+ OpenClaw channels (only the four most popular)
- Schema scraping dev script for auto-generating ChannelDefs
- Host-side validation of optional channel fields or passthrough values

## Context

clawctl hardcodes Telegram as the only communication channel. OpenClaw supports 26+ channels, each with distinct config. Users wanting non-Telegram channels must SSH into the VM manually — defeating clawctl's purpose.

The approach uses three tiers:
1. **Curated sections** (existing): provider, resources, network, etc.
2. **ChannelDef system** (new): data-driven definitions declaring essential fields per channel (~15 lines each), driving validation, wizard, bootstrap, and sanitization
3. **`openclaw` passthrough** (new): arbitrary dotpath-to-value mappings applied via `openclaw config set`

This hybrid avoids maintaining 500+ field definitions while still providing proper secret handling and wizard UX for common channels. Users are never blocked — passthrough covers anything without a ChannelDef.

## Plan

The ChannelDef approach was chosen over:
- **Full typed schemas per channel**: 10-40+ fields each across 26 channels = unmaintainable
- **Pure passthrough**: Can't handle secrets (sanitization, redaction, op:// refs)
- **Runtime schema introspection**: Requires a running VM; can't validate before provisioning

ChannelDefs reuse existing infrastructure: `CapabilityConfigField` type, `CapabilitySection` component, `deriveConfigSchema()`, `getSecretPaths()`.

Implementation phases:
1. Types & ChannelDef infrastructure (new files in types/)
2. Config loading & validation (schema-derive, config.ts)
3. Bootstrap generalization (bootstrap.ts, infra-secrets.ts)
4. Wizard integration (config-builder.tsx, config-review.tsx)
5. Examples, docs, tests

## Steps

- [x] Create `packages/types/src/channels.ts` — ChannelDef type + registry
- [x] Create `packages/types/src/schemas/channels.ts` — Zod schemas
- [x] Update `packages/types/src/types.ts` — add channels/openclaw to InstanceConfig
- [x] Update `packages/types/src/schemas/index.ts` — wire into master schema
- [x] Update `packages/types/src/index.ts` — exports
- [x] Update `packages/host-core/src/schema-derive.ts` — buildChannelsSchema()
- [x] Update `packages/host-core/src/config.ts` — generalized sanitization
- [x] Update `packages/host-core/src/bootstrap.ts` — generic channel loop + passthrough
- [x] Update `packages/host-core/src/infra-secrets.ts` — generalize for channels
- [x] Update `packages/cli/src/steps/config-builder.tsx` — DynamicSection abstraction + channel sections
- [x] Update `packages/cli/src/components/config-review.tsx` — dynamic channel review
- [x] Remove backward compat (top-level telegram, telegramSchema)
- [x] Update examples and docs
- [x] Update tests

## Notes

- Dropped all backward compatibility for top-level `telegram` key per user feedback — not a widely used library yet, clean code preferred.
- Introduced `DynamicSection` abstraction in the wizard that unifies capabilities and channels. This eliminated the scattered `startsWith("cap:")` / `split(":")` string parsing in favor of typed lookups via `findSection()` and `fieldPathOf()`.
- Net code reduction: -112 lines despite adding 4 new channels. The `CapabilitySection` component needed zero changes — it already rendered any `configDef`.

## Outcome

Delivered:
- `ChannelDef` system with Telegram, Discord, Slack, WhatsApp
- `channels` config key replacing top-level `telegram`
- `openclaw` passthrough for arbitrary OpenClaw settings
- Generic bootstrap loop applying any channel's config
- Unified wizard DynamicSection for capabilities + channels
- Secret sanitization generalized for all channels
- Updated tests, examples, and docs

Adding new channels requires only a ~15-line ChannelDef entry in `packages/types/src/channels.ts`. The `openclaw` passthrough lets users configure anything OpenClaw supports immediately, even without a ChannelDef.
