# Fix: onboarding double keypress (round 2)

## Status: Resolved

## Scope

Every key must be pressed twice during the onboarding subprocess
(`openclaw onboard`) that runs after the Ink wizard exits. The previous
fix (stdin cleanup + `SSH="ssh -tt"`) did not resolve the issue.

Does NOT cover: any changes to the Ink wizard steps themselves or the
OpenClaw onboarding wizard.

## Plan

1. Give Ink its own stdin stream (via `/dev/tty`) so it never touches
   `process.stdin`. The subprocess inherits pristine `process.stdin`.
2. Revert `execInteractive()` to simple execa + `stdio: "inherit"`.

## Steps

- [x] Create separate `/dev/tty` ReadStream for Ink in `src/commands/create.ts`
- [x] Revert `src/drivers/lima.ts` to simple execa
- [x] Run tests and lint
- [x] Commit and verify fix manually

## Notes

- **Why post-Ink cleanup never worked**: Ink uses the `'readable'` event
  on stdin, which starts the underlying TTY handle reading from fd 0.
  After Ink exits, `pause()` is a no-op (stream was never in flowing
  mode), `removeAllListeners()` doesn't stop the handle, and
  `_handle.readStop()` doesn't exist in Bun. The handle continues
  consuming bytes, stealing them from any child process sharing fd 0.

- **Failed approaches (4 rounds)**:
  1. `stdin cleanup + SSH="ssh -tt"` — cleanup was ineffective in Bun
  2. `/dev/tty` fds via execa — execa doesn't handle raw fd numbers
  3. `/dev/tty` fds via child_process.spawn — also fails in Bun
  4. `_handle.readStop()` — no-op in Bun (no `_handle` property)

- **What worked**: Don't clean up after Ink — prevent the problem
  entirely. Pass a private `tty.ReadStream` (from `/dev/tty`) to
  Ink's `render()` as the `stdin` option (documented in
  [Ink #378](https://github.com/vadimdemedes/ink/issues/378)).
  Ink reads from its own fd, `process.stdin` is never touched.
  After Ink exits, destroy the private stream. The subprocess then
  inherits a pristine `process.stdin` with no competition for bytes.

## Outcome

1. **Ink gets its own stdin**: `new tty.ReadStream(openSync("/dev/tty", "r"))`
   passed to `render()` via the `stdin` option. Falls back to
   `process.stdin` when `/dev/tty` is unavailable (CI, piped).

2. **`execInteractive()` reverted to simple form**: Just execa with
   `stdio: "inherit"`, no hacks needed.

3. **Net code change**: 15 lines added, 48 removed. Simpler than before.

All 230 tests pass, lint and format checks clean. Manually verified:
keypresses register on first press during onboarding.
