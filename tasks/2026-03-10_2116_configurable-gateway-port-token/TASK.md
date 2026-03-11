# Configurable gateway port + gateway token

## Status: Resolved

## Scope

Two multi-instance support issues:

1. `GATEWAY_PORT` (18789) is hardcoded in the host port forward — two instances collide.
2. Gateway token extraction via `systemctl --user show` fails silently.

Add `network.gatewayPort` (host-side port forward) and `network.gatewayToken`
(inject or extract) to the config schema. VM always uses 18789 internally.

Does NOT cover: wizard UI changes, interactive port selection.

## Plan

1. Add `gatewayPort` and `gatewayToken` to schema + types
2. Thread `gatewayPort` through lima-yaml, provision, headless
3. Rework bootstrap token handling: inject if configured, extract otherwise
4. Use host port in dashboard URL; append token to URL
5. Update example configs
6. Add tests for port validation and lima-yaml host port

## Steps

- [x] Schema + types (`base.ts`, `types.ts`)
- [x] Lima YAML template — accept host port
- [x] Provision — thread port through
- [x] Headless — pass port to provision, log dashboard URL with token
- [x] Bootstrap — inject/extract token, dashboard URL with host port
- [x] Example configs
- [x] Tests
- [x] Verify: `bun test`, lint, format

## Notes

- Token extraction was unreliable: `systemctl --user show -p Environment` failed silently,
  and `openclaw config get` returns `__OPENCLAW_REDACTED__` for secret values. Abandoned
  extraction entirely — we now always inject the token. If `network.gatewayToken` is configured
  we use it; otherwise we generate a random 24-byte hex token. This means we always know the
  token and can print a complete dashboard URL.
- `BootstrapResult.gatewayToken` changed from optional to required — always present now.
- Guest port always stays 18789 — only the host-side forward changes.

## Outcome

Delivered both features as planned:

- `network.gatewayPort`: controls host-side port forward (1024–65535), VM stays on 18789
- `network.gatewayToken`: uses configured value or generates random 24-byte hex token; always injected via `openclaw config set`

Dashboard URL in headless output now uses the configured host port and appends `#token=<token>` when available.

8 new tests added (6 config validation, 2 lima-yaml). All 183 tests pass, lint + format clean.
