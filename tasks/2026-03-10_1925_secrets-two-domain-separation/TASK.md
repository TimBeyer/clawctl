# Fix secrets architecture: two-domain separation

## Status: Resolved

## Scope

Fix the broken secrets architecture in bootstrap step d. The current code uses
non-existent `openclaw secrets configure exec` / `openclaw secrets apply` CLI
commands, causing gateway crash-loops with `SecretRefResolutionError`.

Replace the exec-based secret provider approach with a file-based secret provider
that properly separates two security domains:

1. **Infrastructure secrets** (agent CANNOT access) — API keys, bot tokens stored
   in `~/.openclaw/secrets/infrastructure.json` (off-mount, chmod 700)
2. **Agent 1Password** (agent CAN access) — service account token for the agent's
   own credential management

**Out of scope**: E2E validation (requires running VM), sandbox configuration
changes, changes to the wizard (interactive) flow.

## Plan

1. Export `getNestedValue` from `src/lib/secrets.ts`
2. Create `src/lib/secrets-sync.ts` — write infrastructure.json to VM + .env.secrets to host
3. Create `src/lib/infra-secrets.ts` — patch main config + auth-profiles.json with file provider SecretRefs
4. Update `src/lib/credentials.ts` — change to `~/.openclaw/secrets/` directory
5. Update `src/lib/providers.ts` — remove `secretInputMode` option (always plaintext)
6. Update `src/lib/bootstrap.ts` — replace step d, accept resolvedMap
7. Update `src/headless.ts` — capture op refs, build resolved map, sync secrets
8. Update `src/templates/skills/op-service-account.ts` — two-domain update
9. Update `.gitignore` template in `src/lib/git.ts` to include `.env.secrets`
10. Write tests
11. Verify: `bun test`, `bun run lint`, `bun run format:check`

## Steps

- [x] Create branch and task
- [x] Export `getNestedValue` from secrets.ts
- [x] Create secrets-sync.ts
- [x] Create infra-secrets.ts
- [x] Update credentials.ts
- [x] Update providers.ts (remove secretInputMode)
- [x] Update bootstrap.ts
- [x] Update headless.ts
- [x] Update op-service-account.ts skill template
- [x] Update .gitignore template
- [x] Write unit tests
- [x] Run tests, lint, format check

## Notes

- `secretInputMode` option removed entirely from `buildOnboardCommand` — onboard always
  uses plaintext now. The migration to SecretRefs happens post-onboard via JSON patching.
- The `~/.openclaw/credentials/` directory path changed to `~/.openclaw/secrets/` to
  consolidate all secrets in one chmod-700 directory.
- `getNestedValue` was added alongside the existing private `setNestedValue` in secrets.ts
  to allow headless.ts to extract resolved values from the post-resolution config.

## Outcome

Delivered:

- File-based secret provider architecture replacing the broken exec-based approach
- Infrastructure secrets stored off-mount in `~/.openclaw/secrets/infrastructure.json`
- Post-onboard JSON patching of main config (file provider + telegram SecretRef) and
  auth-profiles.json (token → tokenRef)
- Host-side `.env.secrets` as rebuild cache (gitignored)
- Updated 1Password skill template for two-domain model

Still needs E2E validation:

- `tokenRef` field in auth-profiles.json (exact schema behavior)
- File provider path resolution at runtime
- Auth profile ID format (`<provider>:default`) for all provider types
- Gateway startup without `SecretRefResolutionError`
