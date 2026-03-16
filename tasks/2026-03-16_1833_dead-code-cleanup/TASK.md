# Dead code & misplaced code cleanup

## Status: Resolved

## Scope

Remove dead exports, unused hook return values, unnecessary dynamic imports,
and stale documentation references found during a codebase audit. All items
are minor hygiene — no behavioral changes.

Does NOT cover: any functional changes, new features, or refactoring beyond
the identified dead code.

## Plan

1. Delete `formatZodError` and `expandTilde` from `host-core/src/config.ts` and barrel
2. Delete `openclaw.version()` from `vm-cli/src/tools/openclaw.ts`
3. Remove `clear` from `useProcessLogs` hook and its test
4. Remove `toggle` from `useVerboseMode` hook
5. Remove `driver` prop from `Finish` component and its usage in `app.tsx`
6. Remove unnecessary `updatedCreds` copy in `CredentialSetup`
7. Convert dynamic imports to static imports in `create.ts`
8. Fix stale `tools/types.ts` references in docs
9. Verify: tests pass, lint clean, format clean

## Steps

- [x] Items 1-8 implementation
- [x] `bun test` passes (264 pass, 10 skip, 0 fail)
- [x] `bun run lint` clean
- [x] `bun run format:check` clean
- [x] Grep verification for removed symbols

## Notes

## Outcome

All 8 items delivered as planned:

1. Deleted `formatZodError` + `expandTilde` from host-core (duplicates of types package)
2. Deleted `openclaw.version()` from vm-cli (unused)
3. Removed `clear` from `useProcessLogs` hook + its test
4. Removed `toggle` from `useVerboseMode` hook
5. Removed `driver` prop from `Finish` component
6. Simplified `CredentialSetup` — removed unnecessary `updatedCreds` copy
7. Converted 3 dynamic imports to static imports in `create.ts`
8. Removed stale `tools/types.ts` references from `vm-cli.md` and `architecture.md`

No behavioral changes. All tests pass, lint/format clean.
