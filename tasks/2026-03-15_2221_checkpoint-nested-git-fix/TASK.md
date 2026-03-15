# Checkpoint System: End-to-End Fix and Agent Skill

## Status: Resolved

## Scope

Fix the checkpoint system so `git add data/` works after onboard, and install a checkpoint agent skill. Migrate all skills and scripts from host-side templates to vm-cli provisioning.

Covers:

- Remove nested `.git` created by OpenClaw's onboard inside `data/workspace/`
- Update `.gitignore` template to cover secrets, config backups, and checkpoint signals
- Add defensive check in watch handler for reappearing nested `.git`
- Create checkpoint skill as a `claw provision workspace` stage
- Migrate secret-management skill, op wrapper, exec-approvals to vm-cli

Does NOT cover:

- Changes to the `claw checkpoint` command itself (already works)
- Gitignoring `data/state/` (leaving it tracked for now)

## Plan

1. Remove nested `.git` after onboard in `bootstrap.ts`
2. Update `.gitignore` content in `git.ts`
3. Add defensive check + improved logging in `watch.ts`
4. Add `provision-workspace` lifecycle phase
5. Create `claw provision workspace` stage with all skills + op integration
6. Migrate skills/scripts from `@clawctl/templates` to `vm-cli`
7. Remove host-side installations from `bootstrap.ts`
8. Document the "delegate to claw" principle

## Steps

- [x] Part 1: Remove nested `.git` after onboard in `bootstrap.ts`
- [x] Part 2: Update `.gitignore` in `git.ts`
- [x] Part 3: Defensive check in `watch.ts`
- [x] Add `provision-workspace` to lifecycle phases in `types/constants.ts`
- [x] Create `vm-cli/src/tools/skills.ts` (checkpoint + secret-management)
- [x] Move op wrapper + exec-approvals to `vm-cli/src/tools/op-cli.ts`
- [x] Create `vm-cli/src/commands/provision/workspace.ts` stage
- [x] Register workspace stage in provision/index.ts
- [x] Host calls `claw provision workspace` from `provision.ts`
- [x] Remove skills/scripts from `bootstrap.ts` and `@clawctl/templates`
- [x] Document "delegate to claw" principle in `vm-cli.md`
- [x] Run `bun test`, `bun run lint`, `bun run format:check`

## Notes

- The root cause: OpenClaw's `onboard` creates a nested `.git` in `data/workspace/`. Git can't `add` a directory containing an uncommitted nested repo. Fix: `rm -rf` the nested `.git` after onboard on the host side.
- `workspaceDir` is a host path (virtiofs mount), so `rm` from `fs/promises` works directly.
- Architectural decision: all VM-side setup should go through `claw` provisioning stages, not host-generated shell commands. The host deploys the claw binary and invokes provisioning stages; claw does the actual work inside the VM. This is documented in vm-cli.md.
- The workspace stage auto-detects whether op is installed — no flags needed from the host. Checkpoint skill is unconditional; secret-management, op wrapper, and exec-approvals are conditional on op being present.
- Removed `generateSecretManagementSkill`, `generateOpWrapperScript`, `generateExecApprovals` from `@clawctl/templates` (along with their tests). These now live in vm-cli's tools layer.

## Outcome

Delivered all parts:

1. **Nested `.git` removal** — `bootstrap.ts` removes `data/workspace/.git` after onboard. Core fix.
2. **`.gitignore` update** — Added `data/config.bak*` and `data/.checkpoint-request*`.
3. **Watch handler hardening** — Defensive nested-git check + commit stat logging.
4. **`claw provision workspace`** — New provisioning stage with 4 steps: checkpoint skill (unconditional), secret-management skill (if op), op wrapper (if op), exec-approvals (if op). Added `provision-workspace` lifecycle phase.
5. **Architecture migration** — All skills and scripts moved from `@clawctl/templates` to `vm-cli`. Host bootstrap no longer generates shell commands for skill/script installation — it's all delegated to `claw`.

`data/state/` left tracked — can be gitignored later if it gets noisy.
