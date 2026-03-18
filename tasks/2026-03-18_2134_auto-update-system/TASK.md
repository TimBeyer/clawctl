# Auto-Update System for clawctl

## Status: Resolved

## Scope

Add a complete auto-update system that:

- Notifies users of new GitHub releases via pre-command check (4h TTL cache)
- Downloads and atomically replaces the clawctl binary
- Re-execs as the new binary to push updated claw to running VMs
- Marks stopped VMs as `pendingClawUpdate` for next start
- Adds `claw migrate` for migration-only updates (no full re-provisioning)

Does NOT cover:

- Host-side schema migrations (registry already has `version: 1`)
- Auto-update without user consent (always prompts)

## Context

clawctl has versioned releases on GitHub, capability migrations for VM-side
components, and daemon staleness detection via build hashes. But there's no
mechanism to notify users of new releases or apply updates.

The claw binary is embedded in the compiled clawctl binary via Bun's file
import. After replacing clawctl on disk, only the **new** process can extract
the new claw — creating a re-exec boundary. The daemon restart is already
handled for free by `ensureDaemon()` detecting binary hash changes.

## Plan

10-step implementation:

1. Add `semver` dependency
2. Update state management (`update-state.ts`)
3. GitHub release checker (`update-check.ts`)
4. Registry changes (add `clawVersion?`, `pendingClawUpdate?`)
5. Export `deployClaw` from provision
6. Binary download and replacement (`update-apply.ts`)
7. `clawctl update` command
8. Pre-command update hook
9. `claw migrate` command
10. Pending update on start

Key design decisions:

- Per-version dismissal: saying "no" to v0.15.0 suppresses until v0.16.0+
- `claw migrate` runs only explicit migrations, not full re-provisioning
- Silent degradation on network failure (3s timeout)
- Dev mode detection via `process.execPath.endsWith("/bun")`

## Steps

- [x] Step 1: Add semver dependency
- [x] Step 2: Create update-state.ts
- [x] Step 3: Create update-check.ts
- [x] Step 4: Add registry fields
- [x] Step 5: Export deployClaw
- [x] Step 6: Create update-apply.ts
- [x] Step 7: Create update command
- [x] Step 8: Create pre-command update hook
- [x] Step 9: Create claw migrate command
- [x] Step 10: Pending update on start

## Notes

## Outcome

All 10 steps implemented. The auto-update system covers:

- **Host-side**: `update-state.ts` (cached state with 4h TTL), `update-check.ts`
  (GitHub API with 3s timeout, silent degradation), `update-apply.ts` (atomic
  binary replacement + VM update push)
- **CLI**: `clawctl update` command, pre-command hook with per-version dismissal
- **VM-side**: `claw migrate` command that runs only capability migration chains
- **Lifecycle**: `pendingClawUpdate` flag in registry, applied on next `clawctl start`

Tests added for update-state round-trip and staleness logic. All existing tests pass.
Typecheck and lint clean.
