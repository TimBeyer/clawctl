# Structured Provisioning Stages with Lifecycle-Based Warnings

## Status: Resolved

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

- [x] Add LIFECYCLE_PHASES, LifecyclePhase, phaseReached to @clawctl/types
- [x] Export new constants from types/index.ts
- [x] Create stages.ts with ProvisionStage type and runStage()
- [x] Convert system.ts to stage constant
- [x] Convert tools.ts to stage constant
- [x] Convert openclaw.ts to stage constant
- [x] Update provision/index.ts to use runStage()
- [x] Update doctor.ts with availableAfter and --after flag
- [x] Update verify.ts to pass --after and propagate availableAfter
- [x] Update headless.ts to pass afterPhase and use dynamic warning msg
- [x] Update docs/vm-cli.md
- [x] Update docs/vm-provisioning.md
- [x] Run tests, lint, build

## Notes

- `phaseReached()` uses array index comparison — simple and correct since
  LIFECYCLE_PHASES is ordered.
- Doctor without `--after` treats all failures as errors (strictest mode),
  preserving backwards compat for manual `claw doctor` invocations.
- The `warn` field is kept in JSON output for backwards compat with the
  host verify step, but is now computed from `availableAfter` + `--after`.
- Shell profile step in tools.ts needed a local wrapper function because
  it has inline try/catch logic that doesn't fit a simple tool provision function.

## Outcome

Delivered all planned items:

- Lifecycle phases (`LIFECYCLE_PHASES`, `LifecyclePhase`, `phaseReached()`) in `@clawctl/types`
- `ProvisionStage` type + `runStage()` runner eliminates orchestrator boilerplate
- Three orchestrators converted to declarative stage constants
- Doctor checks use `availableAfter` instead of hardcoded `warn: true`
- `--after <phase>` flag computes warnings from lifecycle position
- Host verify/headless pass `--after provision-openclaw` with dynamic warning messages
- Docs updated
