# Fix: `data/config` created as directory instead of file

## Status: Resolved

## Scope

Remove the `mkdir` call that creates `data/config` as a directory. OpenClaw expects
`OPENCLAW_CONFIG_PATH=/mnt/project/data/config` to be a JSON config **file**, which it
creates itself during onboarding. We only need the parent `data/` directory to exist
(already ensured by the `data/state` mkdir).

Does **not** cover: any changes to OpenClaw's onboarding flow or config format.

## Plan

1. Remove the `mkdir` call for `data/config` on line 65 of `src/steps/create-vm.tsx`
2. Run tests to verify nothing breaks

## Steps

- [x] Remove the offending `mkdir` line
- [x] Run `bun test`
- [x] Mark resolved

## Notes

- The EISDIR error occurs because Lima mounts `data/` into the VM at `/mnt/project/data/`,
  and OpenClaw tries to read/write `/mnt/project/data/config` as a file but finds a directory.

## Outcome

Removed the single `mkdir` call for `data/config` in `src/steps/create-vm.tsx`. The parent
`data/` directory is already created by the `data/state` mkdir. All 12 tests pass.
