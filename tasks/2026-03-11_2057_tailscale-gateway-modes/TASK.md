# Harmonize Tailscale Setup with OpenClaw's Native Tailscale Gateway

## Status: Resolved

## Scope

Wire up OpenClaw's native `gateway.tailscale.mode` config (off/serve/funnel)
so that users who connect Tailscale also get HTTPS on the tailnet via
`tailscale serve`, not just raw `http://100.x.y.z:18789`.

**Covers:**

- Schema + types: add `mode` to tailscale config, `tailscaleMode` to CredentialConfig
- Headless bootstrap: apply `gateway.tailscale.mode` after onboard
- Wizard: mode selection after Tailscale connects (serve/off only; funnel is headless-only)
- Prop threading through app → credentials → onboard → finish → create.ts
- `clawctl list`: show Tailscale URL column when available
- Registry: persist `tailscaleUrl`
- Extract shared `getTailscaleHostname` helper (dedup credentials.ts)
- Fix stale port 3000 → 18789 in docs/tailscale-setup.md
- Update docs with gateway integration section
- Update example-config.full.json
- Tests for schema validation and sanitization

**Does not cover:**

- Funnel in the wizard (headless-config-only due to password requirement)
- Changes to Lima port forwarding (complementary, unchanged)
- `tailscale serve` lifecycle management (OpenClaw handles this natively)

## Plan

1. Fix stale port references in docs/tailscale-setup.md
2. Add `mode` to tailscale config schema + types
3. Extract shared `getTailscaleHostname` helper
4. Configure OpenClaw's Tailscale mode in bootstrap (headless path)
5. Surface Tailscale URL in headless results
6. Wizard integration (credentials → app → finish → create.ts)
7. Update example config
8. Expose Tailscale URL in `clawctl list` (registry + display)
9. Update docs with gateway integration section
10. Tests

## Steps

- [x] Fix port 3000 → 18789 in docs/tailscale-setup.md
- [x] Add `mode` to `InstanceConfig.network.tailscale` in types.ts
- [x] Add `tailscaleMode` to `CredentialConfig` in types.ts
- [x] Add `mode` to tailscale schema in schemas/base.ts
- [x] Extract `getTailscaleHostname()` into src/lib/tailscale.ts
- [x] Refactor credentials.ts to use shared helper
- [x] Add `tailscaleUrl` to `BootstrapResult`, configure mode in bootstrap.ts
- [x] Add `tailscaleUrl` to `HeadlessResult`, pass through in headless.ts
- [x] Wizard: add `ask-tailscale-mode` phase in credentials.tsx
- [x] App: thread `credentialConfig` through to finish/create
- [x] Finish: accept and pass through `tailscaleMode`
- [x] Onboard: accept and pass through `tailscaleMode`
- [x] create.ts: apply tailscale mode post-onboard (wizard path)
- [x] create.ts: persist `tailscaleUrl` in registry (both paths)
- [x] Add `tailscaleUrl` to `RegistryEntry` in registry.ts
- [x] Display TAILSCALE column in list.ts
- [x] Update example-config.full.json
- [x] Update docs/tailscale-setup.md with gateway integration section
- [x] Add tests for tailscale.mode validation + sanitization

## Notes

- Serve mode defaults automatically when Tailscale is configured (no explicit
  `mode` needed in config). This matches the principle that the common case
  should be zero-config.
- Funnel reuses the gateway token as the password — avoids asking for yet
  another secret while being secure (random 24-byte hex).
- The `getTailscaleHostname` helper strips the trailing dot from DNSName, which
  `tailscale status --json` includes (e.g., `hal.tail1234.ts.net.` → `hal.tail1234.ts.net`).
- The TAILSCALE column in `clawctl list` only appears when at least one instance
  has a URL, keeping the default output clean for non-Tailscale users.

## Outcome

All plan items delivered:

- **Types**: `InstanceConfig.network.tailscale.mode` (off/serve/funnel),
  `CredentialConfig.tailscaleMode`, `BootstrapResult.tailscaleUrl`,
  `HeadlessResult.tailscaleUrl`, `RegistryEntry.tailscaleUrl`
- **Schema**: Zod enum validation for mode field
- **Bootstrap (headless)**: Applies `gateway.tailscale.mode` and funnel-specific
  password auth config; queries Tailscale hostname after daemon restart
- **Wizard**: New `ask-tailscale-mode` phase with serve/off selection after
  Tailscale connects; mode threaded through onboard → finish → create.ts
- **Registry + list**: Tailscale URL persisted and displayed conditionally
- **Dedup**: Shared `getTailscaleHostname()` in `src/lib/tailscale.ts`
- **Docs**: Stale port 3000 → 18789; new Gateway Integration section with
  serve/funnel/off mode documentation
- **Tests**: 6 new tests for mode validation + sanitization (all passing)
