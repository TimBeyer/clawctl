# Signal-based cleanup on Ctrl+C during VM creation

## Status: In Progress

## Scope

When the user presses Ctrl+C during VM creation, clean up the partially-created
VM and project directory — same as we already do on error in the headless path.

Covers both headless and interactive wizard paths.

**Not in scope**: cleanup during post-wizard onboarding (the VM is already
registered and the user is told to retry with `clawctl oc onboard`).

## Plan

1. Extract cleanup from headless.ts into a shared `cleanup.ts` module
2. Add `onSignalCleanup()` helper that registers SIGINT/SIGTERM handlers
3. Headless path: register signal handlers during the provisioning window
4. Wizard path: track creation state via mutable ref, clean up on interrupted exit

## Steps

- [ ] Create `packages/host-core/src/cleanup.ts`
- [ ] Update `packages/host-core/src/headless.ts` to use shared cleanup + signal handlers
- [ ] Update `packages/host-core/src/index.ts` to export cleanup
- [ ] Update `packages/cli/src/app.tsx` to accept creation tracking ref
- [ ] Update `packages/cli/src/commands/create.ts` to clean up on wizard interrupt
- [ ] Verify lint + build + tests

## Notes

- In Ink, Ctrl+C is captured as raw input (terminal in raw mode), NOT delivered
  as SIGINT. So the wizard path handles Ctrl+C via the `waitUntilExit()` result
  (undefined = interrupted, vs "onboard"/"finish" = normal exit).
- SIGTERM (from `kill`) still needs a signal handler for both paths.
- Cleanup is idempotent: checks `driver.exists()` before delete, uses `force: true` on rm.

## Outcome

(To be written when resolved)
