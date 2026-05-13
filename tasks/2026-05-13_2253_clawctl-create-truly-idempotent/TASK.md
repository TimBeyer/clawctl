# Make `clawctl create` truly idempotent

## Status: In Progress

## Scope

In:

- Gate first-run-only steps in `bootstrapOpenclaw` on the existing
  `data/config` sentinel so re-running `clawctl create --config <path>`
  against an existing instance doesn't re-run `openclaw onboard`,
  rotate the gateway auth token, or re-send the bootstrap prompt.
- Generalise `patchAuthProfiles` so a provider change between runs
  cleanly evicts the prior `:default` profile and binds the new one.
- Unit tests for the auth-profile swap logic.

Out:

- No new CLI command. The fixes live in the existing path so
  `clawctl create --config <path>` becomes the apply-state operation
  by virtue of being idempotent.
- No changes to `provisionVM` / `claw provision …` — capabilities are
  already idempotent per project convention.
- No changes to `buildOnboardCommand` or the `PROVIDERS` registry.

## Context

The project convention is "all provisioning is idempotent" and "the
project directory is the source of truth". The intended workflow when
changing an instance's config is: edit `clawctl.json`, re-run
`clawctl create`, watch state converge. In practice that path was
_almost_ right — capabilities are idempotent and `provisionVM` skips
Lima VM creation if the VM exists — but `bootstrapOpenclaw` conflated
first-run-only steps with apply-state steps:

- `openclaw onboard` ran unconditionally on every invocation.
- The gateway auth token was generated fresh (`randomBytes(24)`) on
  every run and pushed through `openclaw config set gateway.auth.token`,
  rotating a token that may be wired into remote tooling.
- The bootstrap prompt re-sent on every reapply.
- `patchAuthProfiles` looked up `<currentProvider>:default` and patched
  it in place. When the provider type had _changed_ relative to what was
  on disk it logged "Profile not found — skipping" and the prior
  provider's profile stayed bound.

Together those mean a config edit + re-run can produce incorrect state
(rotated gateway token, wrong provider still active). The fix is two
narrow patches in the existing path; a parallel "reconfigure" command
would split the source-of-truth model and is rejected.

Key invariant: re-running `clawctl create` must converge state without
touching anything that isn't a function of the current clawctl.json —
gateway token preserved, capability state re-applied (no-op when
already installed), auth profile for a different provider replaced.

## Plan

### Fix 1 — Gate first-run-only steps in `bootstrapOpenclaw`

Detect "already onboarded" via `${PROJECT_MOUNT_POINT}/data/config`
existing — the same sentinel onboard's own fault-tolerance check
already uses.

- Sentinel absent → run `openclaw onboard`, generate fresh gateway
  token, send bootstrap prompt (when configured). First-run path.
- Sentinel present → skip onboard. Read the existing
  `gateway.auth.token` from `data/config` and reuse it. Skip the
  bootstrap prompt. Continue with all apply-state steps:
  `openclaw models set`, `openclaw config set …`, channels, secret
  migration, daemon restart, doctor, bootstrap-phase capability hooks.

Implementation: read `data/config` once at the top of
`bootstrapOpenclaw`, branch on existence, thread the existing-or-fresh
token through. Token precedence: explicit `config.network.gatewayToken`
override > existing on-disk token > fresh `randomBytes(24)`.

### Fix 2 — Generalise `patchAuthProfiles` for provider changes

Refactor into a pure transformation
`applyAuthProfileSwap(authProfiles, newProviderType, apiKeyPath)` that
takes the parsed file and returns the converged one. The VM-IO wrapper
reads, calls the pure function, writes back.

Pure behaviour:

1. New profile key: `<newProviderType>:default`.
2. New profile:
   `{ type: "token", provider: newProviderType, tokenRef: makeSecretRef(apiKeyPath) }`.
   If a same-key profile exists, preserve unknown extra fields but
   normalise the canonical ones (`type`, `provider`, `tokenRef`).
3. Evict any other-provider `:default` profile whose `provider` field
   is set and differs from the new provider. Conservative: leave
   profiles whose `provider` field is unset, and non-`:default` keys,
   alone (forward-compat with profile shapes we don't recognise).
4. Reset `lastGood = { [newProviderType]: <newProfileKey> }`.
5. Filter `usageStats` to keys still in `profiles`.

Re-apply semantics:

- Same provider, same apiKey path → no-op.
- Different provider → swap cleanly.
- No `apiKey` resolved → IO wrapper returns early (correct for
  inline-plaintext or no-key flows).

### Rejected alternatives

- A parallel `clawctl reconfigure` command. Would duplicate the
  existing path and split the source-of-truth model.
- Re-running `openclaw onboard --force`. Onboard issues the gateway
  auth token and configures the daemon; even if it accepted a force
  flag it's doing more than what's needed.
- Fix 1 only, without Fix 2. When the provider changed the prior
  profile would remain bound and the new provider would have no
  credentials. Both fixes are needed.
- Touching `patchMainConfig`. Verified re-runnable as-is — it
  overwrites `secrets.providers.infra` with the same value and
  replaces channel secret fields with structurally equivalent
  SecretRefs. No double-encoding because it sets the value rather than
  transforming it.

## Steps

- [x] Get timestamp, create task dir, branch.
- [x] Commit task first.
- [x] Refactor `patchAuthProfiles` into pure + IO layers.
- [x] Unit tests for `applyAuthProfileSwap`: fresh-slate,
      same-provider re-apply (no-op), provider switch (removes old,
      adds new, resets `lastGood`, filters `usageStats`), conservative
      handling of unknown-provider/non-`:default` profiles, no input
      mutation.
- [x] Gate first-run-only steps in `bootstrapOpenclaw`. Read existing
      `data/config` if present; reuse `gateway.auth.token`.
- [x] Run `bun test`, `bun run lint`, `bun run format:check`.
- [ ] End-to-end smoke on an existing instance: re-run
      `clawctl create` against a clawctl.json with a different
      provider, assert `gateway.auth.token` byte-for-byte preserved
      against a `data/config.bak.*` snapshot, assert prior auth profile
      cleanly evicted, `openclaw doctor` green.
- [ ] Open PR.

## Notes

- The sentinel `${PROJECT_MOUNT_POINT}/data/config` was already used
  by onboard's own fault-tolerance check, so we're piggy-backing on an
  invariant openclaw itself relies on.
- Gateway token precedence is intentional: explicit
  `config.network.gatewayToken` wins so a user who wants to rotate can
  set the field; default behaviour preserves.
- `readExistingGatewayToken` swallows JSON parse errors and
  missing-field cases and returns `undefined`, falling through to fresh
  generation, so a corrupt or partially-written `data/config` doesn't
  wedge the reapply path.

## Outcome

(Written at resolution.)
