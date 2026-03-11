# Fix: Agent can't write files during bootstrap

## Status: Resolved

## Scope

After the TUI bootstrap, the agent can't save IDENTITY.md / USER.md
because openclaw's quickstart onboarding sets `tools.profile` to
`"messaging"`, which excludes filesystem access. This task fixes the
profile to `full` before the bootstrap conversation starts.

Does not cover: adding a user-facing option to choose profile, or
reverting to messaging after bootstrap.

## Plan

1. After `daemon start`, set tools.profile to full and restart the daemon
2. Commit

## Steps

- [x] Insert `openclaw config set tools.profile full` + `daemon restart`
      in `bin/cli.tsx` between daemon start and token extraction
- [x] Commit

## Notes

- The fix is two lines: config set + daemon restart. The restart is needed
  so the gateway picks up the new config.
- Users can tighten the profile later with
  `openclaw config set tools.profile messaging`.

## Outcome

Added two `vmExec` calls in `bin/cli.tsx` after `daemon start` to set
`tools.profile` to `full` and restart the daemon, ensuring the agent has
filesystem access during bootstrap.
