# Checkpoint System: End-to-End Fix and Agent Skill

## Status: In Progress

## Scope

Fix the checkpoint system so `git add data/` works after onboard, and install a checkpoint agent skill.

Covers:
- Remove nested `.git` created by OpenClaw's onboard inside `data/workspace/`
- Update `.gitignore` template to cover secrets, config backups, and checkpoint signals
- Add defensive check in watch handler for reappearing nested `.git`
- Create and install a checkpoint agent skill (SKILL.md)

Does NOT cover:
- Changes to the `claw checkpoint` command itself (already works)
- Gitignoring `data/state/` (leaving it tracked for now)

## Plan

1. Remove nested `.git` after onboard in `bootstrap.ts`
2. Update `.gitignore` content in `git.ts`
3. Add defensive check + improved logging in `watch.ts`
4. Create checkpoint skill template, export it, install in bootstrap
5. Add unit test for the checkpoint skill template
6. Run tests, lint, format check

## Steps

- [ ] Part 1: Remove nested `.git` after onboard in `bootstrap.ts`
- [ ] Part 2: Update `.gitignore` in `git.ts`
- [ ] Part 3: Defensive check in `watch.ts`
- [ ] Part 4: Create `packages/templates/src/skills/checkpoint.ts`
- [ ] Part 4: Export from `packages/templates/src/index.ts`
- [ ] Part 4: Install checkpoint skill in `bootstrap.ts`
- [ ] Add test for `generateCheckpointSkill`
- [ ] Run `bun test`, `bun run lint`, `bun run format:check`

## Notes

- The root cause: OpenClaw's `onboard` creates a nested `.git` in `data/workspace/`. Git can't `add` a directory containing an uncommitted nested repo. Fix: `rm -rf` the nested `.git` after onboard on the host side.
- `workspaceDir` is a host path (virtiofs mount), so `rm` from `fs/promises` works directly.
- The checkpoint skill is unconditional — every agent gets it, unlike secret-management which is gated on 1Password config.

## Outcome

(To be written on completion)
