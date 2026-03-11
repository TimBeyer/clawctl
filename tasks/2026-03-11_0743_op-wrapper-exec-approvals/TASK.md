# Fix op token availability + exec approval gating

## Status: Resolved

## Scope

The exec tool doesn't source `~/.profile`, so `OP_SERVICE_ACCOUNT_TOKEN` is
invisible to the agent. Fix by wrapping `op` with a script that reads the token
from the secrets file, and gate `op` behind exec-approval (`ask: on-miss`).

Does NOT change op CLI installation or token validation. Does remove the
now-unnecessary `ensure_in_profile` token export from credentials.ts.

## Plan

1. Create op wrapper template + install in bootstrap
2. Create exec-approvals template + install in bootstrap
3. Update skill content (replace sandbox note with accurate exec guidance)
4. Remove `ensure_in_profile` token export from credentials.ts
5. Update docs
6. Add tests

## Steps

- [x] Create `src/templates/skills/op-wrapper.ts`
- [x] Create `src/templates/exec-approvals.ts`
- [x] Update `src/templates/index.ts` with new exports
- [x] Update `src/lib/bootstrap.ts` — wire wrapper + exec-approvals
- [x] Update `src/lib/credentials.ts` — remove ensure_in_profile
- [x] Update `src/templates/skills/secret-management.ts` — fix skill content
- [x] Update `src/templates/templates.test.ts` — add tests
- [x] Update `docs/1password-setup.md`
- [x] Run tests, lint, format check

## Notes

- Root cause: exec merges login-shell PATH only, not other env vars from ~/.profile
- Built-in 1password skill works around this via tmux (login shell). We can do
  better with a service account + wrapper.
- Wrapper reads token from `~/.openclaw/secrets/op-token` (already persisted by
  credentials.ts) and execs the real binary at `~/.local/bin/.op-real`.
- exec-approvals.json schema: version 1, agents.main with security: allowlist,
  ask: on-miss, allowlist entries with glob pattern for binary path.

## Outcome

Implemented `op` wrapper script + exec-approvals gating:

- Wrapper at `~/.local/bin/op` reads token from secrets file, execs real binary
  at `.op-real`. Agent uses `op` directly — no tmux or env-var prefixing.
- `exec-approvals.json` gates `op` behind `ask: on-miss` (user approves first use).
- Removed `ensure_in_profile` token export from credentials.ts (no longer needed).
- Skill content updated: replaced misleading sandbox note with accurate exec/approval
  guidance; strengthened "supersedes built-in" note.
- 202 tests pass (9 new), lint and format clean.
