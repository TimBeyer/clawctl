# Fix: onboarding double keypress (round 2)

## Status: Resolved

## Scope

Every key must be pressed twice during the onboarding subprocess
(`openclaw onboard`) that runs after the Ink wizard exits. The previous
fix (stdin cleanup + `SSH="ssh -tt"`) did not resolve the issue.

Does NOT cover: any changes to the Ink wizard steps themselves or the
OpenClaw onboarding wizard.

## Plan

1. Change `LimaDriver.execInteractive()` to open `/dev/tty` directly
   instead of using `stdio: "inherit"`, giving the child a fresh fd to
   the terminal that doesn't compete with the parent's `process.stdin`.
2. Enhance the stdin cleanup in `create.ts` to call `readStop()` on the
   underlying handle as defense-in-depth.
3. Remove the `SSH="ssh -tt"` env var hack that was ineffective.

## Steps

- [x] Modify `src/drivers/lima.ts` — `execInteractive()` to use `/dev/tty`
- [x] Enhance `src/commands/create.ts` — stdin cleanup with `readStop()`
- [x] Run tests and lint
- [x] Commit

## Notes

- **Why the previous fix failed**: Ink uses the `'readable'` event (not
  `'data'`) on stdin. This means stdin was never in flowing mode. The
  cleanup code calls `pause()`, but `pause()` only sets
  `state.flowing = false` — a no-op when the stream was never flowing.
  The underlying TTY handle stays in `readStart` mode, continuously
  reading from fd 0 into Node's/Bun's internal buffer. When the child
  process inherits fd 0 via `stdio: "inherit"`, both parent and child
  compete for the same bytes — the parent steals alternating keypresses.

- **Why `/dev/tty`**: Opening `/dev/tty` gives a completely independent
  file descriptor to the controlling terminal. The parent's polluted
  `process.stdin` (fd 0) doesn't interfere. This is a standard POSIX
  pattern for programs that need terminal access after stdin has been
  consumed or redirected.

- **Why not `process.stdin.destroy()`**: For a TTY ReadStream (which
  extends net.Socket), `destroy()` calls `_handle.close()` which closes
  the underlying fd. This would break the child process's access to fd 0.

## Outcome

1. **`execInteractive()` uses `/dev/tty`**: Opens a fresh fd to the
   controlling terminal instead of inheriting fd 0. This completely
   bypasses the parent's polluted `process.stdin` handle.

2. **`readStop()` defense-in-depth**: After Ink exits, the stdin cleanup
   now directly calls `_handle.readStop()` to stop the underlying TTY
   handle from reading fd 0, in case any other code path still uses
   `stdio: "inherit"`.

3. **Removed `SSH="ssh -tt"` hack**: This was a workaround from the
   first fix attempt that didn't address the root cause (parent stealing
   bytes from fd 0). PTY allocation via limactl shell works correctly
   without it.

All 230 tests pass, lint and format checks clean.
