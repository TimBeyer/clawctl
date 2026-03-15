# Structured Provisioning Stages with Lifecycle-Based Warnings

## Status: In Progress

## Scope

Replace ad-hoc orchestrator functions in the vm-cli with data-driven
stage definitions. Replace hardcoded `warn: true` flags in doctor checks
with lifecycle-phase-based classification via `availableAfter` +
`--after <phase>` flag.

**In scope**:
- Lifecycle phases in `@clawctl/types`
- `ProvisionStage` type + `runStage()` runner in `stages.ts`
- Convert system.ts, tools.ts, openclaw.ts to stage constants
- Doctor `availableAfter` + `--after` flag
- Host-side verify.ts + headless.ts pass `--after`
- Doc updates

**Out of scope**:
- Changes to tool modules (`tools/*.ts`)
- Changes to `output.ts` or `exec.ts`
- Changes to `host-core/src/provision.ts`

## Plan

1. Add lifecycle constants to `@clawctl/types`
2. Create `stages.ts` with types + runner
3. Convert three orchestrators to stage constants
4. Update `provision/index.ts` to use `runStage()`
5. Update `doctor.ts` — availableAfter on checks, --after flag, compute warn
6. Update `verify.ts` — pass afterPhase, propagate availableAfter
7. Update `headless.ts` — pass "provision-openclaw", dynamic warning msg
8. Update docs

## Steps

- [ ] Add LIFECYCLE_PHASES, LifecyclePhase, phaseReached to @clawctl/types
- [ ] Export new constants from types/index.ts
- [ ] Create stages.ts with ProvisionStage type and runStage()
- [ ] Convert system.ts to stage constant
- [ ] Convert tools.ts to stage constant
- [ ] Convert openclaw.ts to stage constant
- [ ] Update provision/index.ts to use runStage()
- [ ] Update doctor.ts with availableAfter and --after flag
- [ ] Update verify.ts to pass --after and propagate availableAfter
- [ ] Update headless.ts to pass afterPhase and use dynamic warning msg
- [ ] Update docs/vm-cli.md
- [ ] Update docs/vm-provisioning.md
- [ ] Run tests, lint, build

## Notes

## Outcome
