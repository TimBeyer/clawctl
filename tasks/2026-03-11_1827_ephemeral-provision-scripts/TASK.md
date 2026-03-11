# Remove `scripts/` from generated project directories

## Status: Resolved

## Scope

Make provisioning scripts ephemeral: write them directly into the VM via
`shellExec` heredocs instead of persisting them in the host project directory.
The `scripts/` directory no longer appears in generated projects.

Does NOT cover:

- The future `claw` CLI for reprovisioning
- Changes to template content (only delivery mechanism changes)

## Plan

1. Modify `src/lib/provision.ts` to write scripts into VM via heredocs
2. Inline `ensure_in_profile` in `src/lib/credentials.ts`
3. Update 6 doc files to remove `scripts/` references
4. Update test comments in `tests/vm/provision.test.ts`

## Steps

- [x] `provision.ts` — write scripts to VM `/tmp/clawctl-provision/`, clean up after
- [x] `credentials.ts` — inline `ensure_in_profile` logic
- [x] `docs/generated-project.md` — remove scripts section
- [x] `docs/vm-provisioning.md` — update script location and reprovisioning
- [x] `docs/architecture.md` — remove scripts from project dir listing
- [x] `docs/cli-wizard-flow.md` — update file generation references
- [x] `docs/snapshots-and-rebuilds.md` — remove scripts from listings
- [x] `docs/testing.md` — update provisioning script references
- [x] `tests/vm/provision.test.ts` — update comments

## Notes

- The existing pattern for writing files into the VM via heredocs is established
  in `bootstrap.ts:137-160` (skill files, op wrapper, exec-approvals).
- Orchestrator scripts use `SCRIPTS_DIR="$(dirname "$0")"` to find siblings,
  so they work regardless of location — no template changes needed.
- Reprovisioning via mount is removed; proper workflow is delete + recreate VM.

## Outcome

Provisioning scripts are now ephemeral. They are generated from templates,
written into the VM at `/tmp/clawctl-provision/` via `shellExec` heredocs,
executed, and cleaned up — never persisted in the host project directory.

- `provision.ts`: removed `scripts/` mkdir and host file writes; scripts are
  deployed to VM after creation, cleaned up after provisioning
- `credentials.ts`: inlined `ensure_in_profile` logic (no longer sources
  `helpers.sh` from mount)
- Removed `PROJECT_MOUNT_POINT` import from `provision.ts` (no longer needed)
- Updated 6 docs and test comments
- No template content changes — only delivery mechanism changed
- Reprovisioning workflow is now delete + recreate VM (scripts are not
  user-editable artifacts)
