# VMDriver Abstraction

## Status: Resolved

## Scope

Formalize the implicit VM operations interface (currently bare function exports
in `src/lib/lima.ts`) into an explicit `VMDriver` interface. Lift all Lima-specific
logic into a `LimaDriver` class. Thread the driver through all consumers via
parameter injection.

**Not in scope**: implementing a second backend, changing template generation,
or altering VM provisioning behavior.

## Plan

1. Create `src/drivers/types.ts` with the VMDriver interface
2. Create `src/drivers/lima.ts` with LimaDriver class (logic from lib/lima.ts + homebrew Lima functions)
3. Create `src/drivers/index.ts` barrel export
4. Migrate lib consumers bottom-up (verify, credentials, secrets, infra-secrets, secrets-sync, prereqs, provision, bootstrap)
5. Migrate entry points + UI (headless, app, step components, bin/cli.tsx)
6. Delete `src/lib/lima.ts`, remove Lima functions from homebrew.ts
7. Rename PrereqStatus fields: hasLima → hasVMBackend, limaVersion → vmBackendVersion

## Steps

- [x] Phase 1: Create driver interface + LimaDriver
- [x] Phase 2: Migrate lib consumers
- [x] Phase 3: Migrate entry points + UI
- [x] Phase 4: Cleanup (delete old files, update homebrew.ts)
- [x] Verify: lint, format, tests pass

## Notes

- `provision.ts` no longer generates lima.yaml — that's now inside
  `LimaDriver.create()`, which calls `generateLimaYaml()` and writes the file.
- The `GenerateLimaYamlOptions` type was removed from provision.ts since the
  driver interface uses `VMCreateOptions` instead.
- `bin/cli.tsx` now has an import statement (for LimaDriver), which makes it a
  proper module. This surfaced a pre-existing tsc error in headless.ts
  (`Record<string, unknown>` → `InstanceConfig` cast) that was previously hidden
  behind `bin/cli.tsx` module errors. Fixed with intermediate `unknown` cast.
- `execInteractive` is on the driver (not a local helper in cli.tsx) because
  it encapsulates Lima's SSH PTY hack (`SSH=ssh -tt`).

## Outcome

Delivered the full VMDriver abstraction as planned:

- **New files**: `src/drivers/types.ts`, `src/drivers/lima.ts`, `src/drivers/index.ts`
- **Deleted**: `src/lib/lima.ts`
- **Modified**: 17 files migrated from direct lima.ts imports to VMDriver parameter injection
- **Renamed**: `hasLima`/`limaVersion` → `hasVMBackend`/`vmBackendVersion` in PrereqStatus
- All 204 unit tests pass, lint clean, format clean, tsc clean
- No behavioral changes — pure structural refactor
