# Complete the OpenClaw VM bootstrap flow

## Status: Resolved

## Scope

Covers:

- Updating project docs (CLAUDE.md, architecture.md) to capture the full-lifecycle vision
- Adding OpenClaw installation to VM provisioning (installer template, provision chain, verification)
- Adding an onboarding step to the wizard (unmount + stdio inherit approach)
- Updating the finish screen to be context-aware (onboarded vs skipped)

Does NOT cover:

- Embedded PTY-in-Ink onboarding surface (Part 4 — future work)
- Multi-instance management
- `data/` persistence testing with actual OpenClaw

## Plan

1. Update CLAUDE.md intro paragraph to capture full-lifecycle vision
2. Update docs/architecture.md to reflect expanded scope and onboarding approach
3. Create `src/templates/installers/openclaw.ts` installer template
4. Wire installer into provision chain, template exports, and create-vm step
5. Add `openclaw --version` verification to provision-status
6. Add `onboardSkipped` flag to types.ts, `"onboard"` to WizardStep
7. Create `src/steps/onboard.tsx` (unmount + stdio inherit)
8. Update app.tsx to wire onboard step (8 total steps)
9. Update finish.tsx to be context-aware
10. Update all StepIndicator totals from 7 to 8
11. Run tests to verify nothing is broken

## Steps

- [x] Update CLAUDE.md
- [x] Update docs/architecture.md
- [x] Create src/templates/installers/openclaw.ts
- [x] Update src/templates/provision-user.ts
- [x] Update src/templates/index.ts
- [x] Update src/steps/create-vm.tsx
- [x] Update src/steps/provision-status.tsx
- [x] Update src/types.ts
- [x] Create src/steps/onboard.tsx
- [x] Update src/app.tsx
- [x] Update src/steps/finish.tsx
- [x] Update StepIndicator totals across all steps
- [x] Run tests

## Notes

- Ink 6 uses `useApp().exit()` (not `unmount()`) to teardown the Ink instance. The onboard component calls `exit()` with a result payload, and the CLI entry point (`bin/cli.tsx`) picks up that result after `waitUntilExit()` resolves to run the interactive subprocess. This split is necessary because once `exit()` is called, React is unmounted — no component code runs after that.
- OpenClaw env vars (`OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH`) point to `/mnt/project/data/` so config/state persists on the host and survives VM rebuilds.
- The official installer URL `https://openclaw.ai/install.sh` is used with `--no-onboard --no-prompt` flags to separate installation from onboarding.

## Outcome

Delivered Parts 1-3 of the plan:

- **Part 1**: Updated CLAUDE.md and docs/architecture.md with full-lifecycle vision
- **Part 2**: OpenClaw installer template, wired into provisioning chain and verification
- **Part 3**: Onboard step (unmount + stdio inherit), context-aware finish screen, wizard flow now 8 steps

Deferred:

- Part 4: Embedded PTY-in-Ink onboarding surface (future work, documented in architecture.md)
- Multi-instance management
- End-to-end testing with actual OpenClaw (requires running VM)
