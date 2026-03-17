# Fix TUI rendering bugs

## Status: Resolved

## Scope

Fix three bugs in the interactive TUI create flow:

1. **Duplicate "[v]" hint** — During the provision phase, both `App` and
   `ProvisionMonitor` render a "[v] show/hide logs" hint, resulting in two
   lines.
2. **Ctrl-C cleanup missing** — Ink intercepts Ctrl-C in raw mode (as a
   character '\x03', not a SIGINT), so the `onSignalCleanup` process-level
   handlers registered by `runHeadlessFromConfig` never fire. The VM and
   project directory are left behind on interrupt.
3. **Ghost UI elements** — Ink's differential rendering leaves artifacts when
   the output height shrinks between phases (e.g., two-pane config builder →
   single-column provision monitor). Old content remains visible on screen.

Does **not** cover: headless mode (already works), abort during prereqs or
config phases (no VM exists yet).

## Plan

1. Remove the global "[v]" hint from `app.tsx` during the provision phase
   — `ProvisionMonitor` already renders its own.
2. Add an `onProvisionStart` callback prop to `App` so `runCreateWizard`
   can capture the `InstanceConfig` when provisioning begins.
3. After `waitUntilExit()` in `runCreateWizard`, if the exit result isn't
   a success and config was captured, compute the VM config and run
   `cleanupVM`.

## Steps

- [x] Fix duplicate "[v]" hint in `app.tsx`
- [x] Add `onProvisionStart` callback to `App`
- [x] Add cleanup logic to `runCreateWizard` after Ink exits
- [x] Clear terminal on phase transitions to prevent ghost elements
- [x] Verify no type errors

## Outcome

All three bugs fixed:

1. **Duplicate hint**: Changed `app.tsx` to only show the `[v]` hint during the
   `prereqs` phase. During `provision`, `ProvisionMonitor` renders its own hint.
2. **Ctrl-C cleanup**: Added `onProvisionStart` callback to `App` so
   `runCreateWizard` captures the `InstanceConfig`. After `waitUntilExit()`, if
   the result isn't a success and provisioning had started, it computes the VM
   config and calls `cleanupVM` to delete the VM and project directory.
3. **Ghost UI elements**: Added `useLayoutEffect` in `App` that clears the
   terminal (`\x1b[2J\x1b[H`) on phase transitions. Runs before Ink writes the
   new frame, so the new phase content is drawn on a clean slate.

No new type errors introduced.

## Notes

- Ink with raw mode stdin converts Ctrl-C to a character, not SIGINT.
  `onSignalCleanup` registers on `process.on('SIGINT')`, which never fires.
- The headless pipeline's catch-block cleanup also doesn't trigger because
  no error is thrown — the promise is just abandoned when the process exits.
- We import `configToVMConfig` and `cleanupVM` in `create.ts` to compute
  the target from the captured config.
