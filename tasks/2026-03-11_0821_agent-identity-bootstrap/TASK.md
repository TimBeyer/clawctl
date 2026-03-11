# Non-interactive agent identity bootstrapping

## Status: Resolved

## Scope

Add a `bootstrap` config field that sends a prompt to the agent via the gateway
Chat Completions API after daemon restart. The agent creates its own identity
files (IDENTITY.md, USER.md, SOUL.md) — we don't template them ourselves.

`bootstrap` accepts either:

- **Structured object** → generate prompt from template with identity/user data
- **Raw string** → sent as-is for full control

Not in scope: interactive mode changes, dashboard UI, retry logic.

## Plan

1. Add `bootstrap` field to `InstanceConfig` type
2. Create Zod schema for bootstrap config (`src/lib/schemas/bootstrap.ts`)
3. Wire schema into composed config schema
4. Create prompt template (`src/templates/bootstrap-prompt.ts`)
5. Send bootstrap prompt via `openclaw agent --message` in VM
6. Add bootstrap step to `bootstrapOpenclaw()` after doctor
7. Add tests for prompt template
8. Add bootstrap example to `example-config.full.json`
9. Re-export from templates index

## Steps

- [x] `src/types.ts` — add `bootstrap` to `InstanceConfig`
- [x] `src/lib/schemas/bootstrap.ts` — Zod schema
- [x] `src/lib/schemas/index.ts` — wire bootstrap schema
- [x] `src/templates/bootstrap-prompt.ts` — prompt generator (name + freeform context)
- [x] `src/templates/index.ts` — re-export
- [x] `src/lib/bootstrap.ts` — add step after doctor using `openclaw agent --message`
- [x] `src/templates/templates.test.ts` — prompt template tests
- [x] `src/lib/redact.ts` — secret redaction utility
- [x] `src/lib/redact.test.ts` — redact tests
- [x] `example-config.full.json` — add bootstrap example
- [x] Run tests, lint, format

## Notes

- Original plan used a gateway HTTP API client with SSE parsing. Switched to
  `openclaw agent --agent main --message` inside the VM — much simpler,
  delegates to OpenClaw's own CLI, no auth/SSE/readiness concerns.
- Structured config was initially rigid fields (creature, vibe, emoji, callMe,
  timezone). Simplified to `name` + freeform `context` string after seeing a
  real IDENTITY.md — the rich context doesn't fit neat key-value pairs.
- Bootstrap prompt runs after `openclaw doctor` so we know the gateway is
  healthy before talking to the agent.
- Added `redact()` utility (first 3 + last 3 chars, \*\*\* middle) to mask
  secrets in log output — gateway token and Telegram bot token were being
  logged in plaintext.

## Outcome

Delivered: `bootstrap` config field (string or structured object) that sends
an identity prompt to the agent after provisioning. Uses OpenClaw's own CLI.
Also added `redact`/`redactSecrets` utility for safe secret logging.

Deleted: `src/lib/gateway.ts` (HTTP API client) — replaced by CLI approach.
