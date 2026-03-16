# Dead code & misplaced code cleanup

## Status: In Progress

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

- [ ] Items 1-8 implementation
- [ ] `bun test` passes
- [ ] `bun run lint` clean
- [ ] `bun run format:check` clean
- [ ] Grep verification for removed symbols

## Notes

## Outcome
