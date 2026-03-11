# Fix silent failure cascade in CLI wizard

## Status: Resolved

## Scope

Fix three compounding bugs that cause the wizard to appear to succeed while doing nothing when an existing VM is stopped:

1. `create-vm.tsx` skips creation when VM exists but never ensures it's running
2. `create-vm.tsx` ignores `runProvisionScript()` exit codes
3. `provision-status.tsx` calls `onComplete()` unconditionally, even when checks fail

**Not in scope**: changes to `lima.ts`, `exec.ts`, `app.tsx`, or provisioning scripts.

## Plan

1. In `create-vm.tsx`: import `getVMStatus`/`startVM`, add start-if-stopped logic, check provisioning exit codes
2. In `provision-status.tsx`: track `allPassed` as local variable, gate `onComplete()` on success

## Steps

- [x] Update `create-vm.tsx` — VM start logic + exit code checks
- [x] Update `provision-status.tsx` — gate onComplete on all checks passing
- [x] Run `bun test`

## Notes

- Root cause of Node.js failure: `limactl create --tty=false` does NOT start the VM.
  `createVM()` only ran `limactl create`, then provisioning tried `limactl shell` on a
  stopped VM — which returns exit code 0 with no output (doesn't run anything).
  This is a Lima behavior: `limactl shell` against a stopped VM silently succeeds.
- The exit code checks we added couldn't catch this because the exit code was genuinely 0.
- Fix: `createVM()` now explicitly calls `limactl start` after `limactl create`.

## Outcome

Four bugs fixed across three files:

- `lima.ts`: `createVM()` now calls `limactl start` after `limactl create` — the actual root cause of provisioning never running
- `create-vm.tsx`: imports and uses `getVMStatus`/`startVM` to ensure a stopped VM is started before provisioning; checks `exitCode` on both provisioning scripts and throws on failure
- `provision-status.tsx`: tracks `allPassed` as a local variable (not React state, avoiding batching issues); only calls `onComplete()` when all checks pass, otherwise shows error message
- All 12 existing tests pass
