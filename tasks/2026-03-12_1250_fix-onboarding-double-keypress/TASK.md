# Fix: onboarding double keypress (round 2)

## Status: In Progress

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

- [ ] Modify `src/drivers/lima.ts` — `execInteractive()` to use `/dev/tty`
- [ ] Enhance `src/commands/create.ts` — stdin cleanup with `readStop()`
- [ ] Run tests and lint
- [ ] Commit

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

_To be written when resolved._
