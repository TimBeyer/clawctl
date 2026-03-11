# Move provisioning from VM boot to post-boot CLI step

## Status: Resolved

## Scope

Move provisioning scripts out of Lima's `provision:` blocks in lima.yaml and
into a new "provisioning" phase in the CreateVM wizard step. This gives us
streaming output and avoids re-running provision scripts on every `limactl start`.

**Not in scope**: changing the provision scripts themselves, adding retry logic,
or changing the onboarding step.

## Plan

1. Remove `provision:` section from `src/templates/lima-yaml.ts`
2. Add `"provisioning"` phase to `src/steps/create-vm.tsx` that runs scripts via `runProvisionScript`
3. Update `src/components/process-output.tsx` to show last log line by default (full log in verbose mode)

## Steps

- [x] Remove provision blocks from lima-yaml.ts
- [x] Add provisioning phase to create-vm.tsx
- [x] Update process-output.tsx to show last log line
- [x] Verify with `bun test`

## Notes

## Outcome

All three changes implemented. Provisioning now runs as a post-boot CLI phase
via `runProvisionScript` / `limactl shell`, giving the user streaming output.
`limactl stop/start` no longer re-runs provisioning. Tests pass (12/12).
