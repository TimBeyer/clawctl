# Move misplaced exports out of @clawctl/types

## Status: Resolved

## Scope

Move exports that don't belong in the shared `@clawctl/types` package to their correct homes:

1. CLI-only types (`PrereqStatus`, `CredentialConfig`, `WizardStep`, `ProvisioningStep`) to `@clawctl/cli`
2. `BIN_NAME` constant to `@clawctl/host-core`
3. Business logic functions (`configToVMConfig`, `sanitizeConfig`, `buildOnboardCommand`) to `@clawctl/host-core`
4. Remove `formatZodError` and `expandTilde` from barrel exports (keep as internal helpers in types)

Does NOT cover: moving schemas, secrets functions, or constants.

## Plan

1. Create `packages/cli/src/types.ts` with the four CLI-only types
2. Remove those types from `@clawctl/types` barrel and source
3. Update CLI imports to use local types
4. Move `BIN_NAME` to `@clawctl/host-core`
5. Move `configToVMConfig`, `sanitizeConfig` to `@clawctl/host-core/src/config.ts`
6. Remove `formatZodError`, `expandTilde` from barrel (keep in source for `validateConfig`)
7. Move `buildOnboardCommand` to `@clawctl/host-core/src/providers.ts`
8. Update all consumer imports
9. Run tests and lint

## Steps

- [x] Create `packages/cli/src/types.ts`
- [x] Update `packages/types/src/types.ts` — remove CLI types
- [x] Update `packages/types/src/index.ts` — remove CLI types from barrel
- [x] Update CLI files to import from local types
- [x] Move `BIN_NAME` to `packages/host-core/src/bin-name.ts`
- [x] Update all `BIN_NAME` imports
- [x] Move `configToVMConfig`, `sanitizeConfig` to host-core config.ts
- [x] Remove `formatZodError`, `expandTilde` from types barrel
- [x] Move `buildOnboardCommand` to host-core providers.ts
- [x] Update all consumer imports
- [x] Run tests and lint

## Notes

- `PrereqStatus` is also used in `host-core/src/prereqs.ts` — it will need to import from `@clawctl/cli` or we duplicate the type. Since host-core shouldn't depend on cli, we'll keep it in types but only export to host-core consumers. Actually, looking more carefully: `PrereqStatus` is returned by `checkPrereqs` in host-core and consumed by CLI components. The type flows from host-core to cli. The cleanest solution is to put it in cli/src/types.ts and have host-core's `checkPrereqs` return a plain object that satisfies that interface. But the instruction says to move it to cli. Let me re-read... The instruction says to move it to `@clawctl/cli`. Since host-core/prereqs.ts also uses it, we need to handle that. The simplest approach: keep it in types or duplicate. Given the instruction explicitly says to move these to cli, and host-core uses PrereqStatus, I'll need to check if host-core depends on cli (it shouldn't). So the right approach is to keep PrereqStatus in @clawctl/types but just for the host-core consumer, OR inline the return type in prereqs.ts. Actually, looking at the code more carefully, host-core/prereqs.ts only defines the shape — the CLI is the consumer that names the type. I can have prereqs.ts return a plain inferred type and the CLI can define the named interface.

## Outcome

All misplaced exports moved successfully:

- **CLI types** (`PrereqStatus`, `CredentialConfig`, `WizardStep`, `ProvisioningStep`): moved to `packages/cli/src/types.ts`. `PrereqStatus` is also defined locally in `packages/host-core/src/prereqs.ts` since host-core can't depend on cli — both definitions are structurally identical.
- **`BIN_NAME`**: moved to `packages/host-core/src/bin-name.ts`. Host-core files use relative imports; CLI files import from `@clawctl/host-core`.
- **`configToVMConfig`, `sanitizeConfig`**: moved into `packages/host-core/src/config.ts` alongside `loadConfig`. No longer re-exported from types.
- **`formatZodError`, `expandTilde`**: kept in `packages/types/src/config.ts` as private helpers for `validateConfig` (not exported from barrel). Also exported from host-core for the test suite.
- **`buildOnboardCommand`**: moved to new `packages/host-core/src/providers.ts`.

`@clawctl/types` now exports only: types/interfaces, schemas, constants, provider registry (data), `validateConfig`, and secrets utilities. All 280 tests pass, lint clean, formatting clean.
