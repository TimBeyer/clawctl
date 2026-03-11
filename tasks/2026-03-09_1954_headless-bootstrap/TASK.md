# End-to-end headless bootstrap

## Status: Resolved

## Scope

Make `clawctl create --config config.json` produce a fully working openclaw
instance — daemon running, model configured, optionally Telegram connected —
accessible via the Chat UI immediately.

Covers:

- Extending `InstanceConfig` with `provider` and `telegram` sections
- Validating the new config sections
- Creating `bootstrap.ts` to run `openclaw onboard --non-interactive` + post-config
- Integrating bootstrap into `headless.ts`
- Updating example configs and docs

Does NOT cover:

- Interactive wizard changes
- Multiple provider support (only Anthropic API key for now)
- Telegram webhook setup (just config, openclaw handles the rest)

## Plan

1. Extend types + config validation + tests — commit
2. Create `bootstrap.ts` — commit
3. Integrate into `headless.ts` — commit
4. Example configs + docs — commit

## Steps

- [x] Add `provider` and `telegram` to `InstanceConfig` in `src/types.ts`
- [x] Add validation for new sections in `src/lib/config.ts`
- [x] Add tests in `src/lib/config.test.ts`
- [x] Create `src/lib/bootstrap.ts`
- [x] Integrate bootstrap into `src/headless.ts`
- [x] Update `example-config.full.json` with provider + telegram
- [x] Create `example-config.bootstrap.json`
- [x] Update `README.md`
- [x] Update `docs/architecture.md`

## Notes

### Design: delegate to `openclaw onboard --non-interactive`

The key discovery is that `openclaw onboard --non-interactive` handles auth,
daemon install, gateway config, and model setup in one command. This is the
documented automation path. We delegate to it rather than writing config files
directly, consistent with the project's "delegate, don't duplicate" principle.

### API key passed via env var

Pass `ANTHROPIC_API_KEY` as an environment variable in the shell command to
avoid shell escaping issues with special characters in keys.

### Telegram as post-onboard config

Telegram is configured via `openclaw config set` after onboarding, not via
onboard flags. This is simpler and the config keys are well-documented.

### Switched to zod for config validation

User requested zod instead of hand-rolled validation. Replaced all manual
type checking in `config.ts` with a zod schema. Custom error messages on
`.min()` validators preserve readable errors. Used `z.record(z.string(), ...)`
for record types to handle keys starting with `-` (zod v4 default key schema
rejects them).

## Outcome

Delivered all planned items:

- `InstanceConfig` extended with `provider` and `telegram` sections
- Config validation rewritten with zod (41 tests pass)
- `src/lib/bootstrap.ts` delegates to `openclaw onboard --non-interactive`,
  applies post-onboard config, configures Telegram, restarts daemon, extracts
  gateway token, runs doctor, creates workspace dir
- `src/headless.ts` conditionally runs bootstrap when `provider` is present
- Example configs and docs updated

Not yet tested end-to-end (requires real API key + VM). The bootstrap module
follows the same patterns as existing provisioning code (shellExec, OnLine
callbacks, non-fatal warnings for optional steps).
