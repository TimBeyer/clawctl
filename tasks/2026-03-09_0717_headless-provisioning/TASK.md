# Headless provisioning + remove home directory mount

## Status: Resolved

## Scope

Add `clawctl create --config config.json` for config-file-driven VM creation
with no interactive prompts. Also remove the `~` home directory mount from
lima.yaml (security fix).

**Not in scope**: wiring up `tools`, `mounts`, `agent.toolsProfile`,
`agent.sandbox` config fields — types only, for forward compatibility.

## Plan

1. Remove home dir mount (constants, lima-yaml, tests)
2. Add `InstanceConfig` type to `src/types.ts`
3. Extract `prereqs.ts`, `provision.ts`, `verify.ts`, `credentials.ts` from wizard components
4. Create `config.ts` + `config.test.ts`
5. Update `generateLimaYaml` to accept `forwardGateway` option
6. Create `headless.ts` + modify `bin/cli.tsx`
7. Example configs + docs + CLAUDE.md

## Steps

- [x] Remove `HOST_MOUNT_POINT` from constants.ts
- [x] Remove home mount from lima-yaml.ts
- [x] Update lima-yaml tests
- [x] Add `InstanceConfig` to types.ts
- [x] Extract `src/lib/prereqs.ts`
- [x] Extract `src/lib/provision.ts`
- [x] Extract `src/lib/verify.ts`
- [x] Extract `src/lib/credentials.ts`
- [x] Update wizard components to use extracted modules
- [x] Create `src/lib/config.ts` + `src/lib/config.test.ts`
- [x] Add `forwardGateway` option to `generateLimaYaml`
- [x] Create `src/headless.ts`
- [x] Update `bin/cli.tsx` for CLI dispatch
- [x] Create example configs
- [x] Update CLAUDE.md and docs
- [x] All tests pass, lint clean, format clean

## Notes

- CLI dispatch uses `process.argv` check before importing React/Ink, so
  headless mode never loads UI dependencies — keeps it fast and CI-friendly.
- `provisionVM()` accepts a callbacks object (`onPhase`, `onStep`, `onLine`)
  so the wizard can drive React state and headless can drive console.log.
- `generateLimaYaml` now takes an optional `LimaYamlOptions` with
  `forwardGateway` — when false, the portForwards section is omitted entirely.
  Default is true (backward-compatible).
- Tailscale headless uses `--authkey` flag for non-interactive auth.
  Interactive wizard path uses `connectTailscaleInteractive()` (no authkey).
- The `InstanceConfig` type includes forward-looking fields (`tools`, `mounts`,
  `agent.toolsProfile`, `agent.sandbox`) that are typed but not wired up yet.

## Outcome

Delivered:

- `clawctl create --config <path>` — full headless provisioning pipeline
- Removed `~` home directory mount from lima.yaml (security fix)
- Extracted 4 shared modules from wizard components (prereqs, provision,
  verify, credentials) — both wizard and headless paths reuse same logic
- `InstanceConfig` schema with validation, defaults, and tilde expansion
- 25 new config tests, 2 new lima-yaml tests (forwardGateway)
- Example configs (minimal + full) and updated docs

Deferred:

- `tools` config section (future: tool installer templates)
- `mounts` config section (future: custom lima.yaml mounts)
- `agent.toolsProfile` and `agent.sandbox` (future: post-onboard config)
