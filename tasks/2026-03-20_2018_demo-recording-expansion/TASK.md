# Expand Demo Recording: CI, Website, E2E

## Status: Resolved

## Scope

Expand the single-demo recording pipeline into a full framework supporting:

- Multiple per-feature demo scripts with a shared library
- CI pipeline for automated GIF generation with PR review
- Live asciinema player integration on the docs-site
- E2E testing layered onto the recording infrastructure

Does NOT cover: changing the wizard UI itself, adding new CLI commands,
or modifying the Lima VM configuration.

## Context

We have a working `scripts/record-demo.sh` that drives `clawctl create` via
tmux + asciinema → agg → GIF in README. The user wants to expand this in
three directions: (1) CI automation so GIFs are never stale, (2) real
asciinema recordings on the docs-site replacing static Terminal mockups,
(3) E2E testing that reuses the recording scripts.

The recording drives the **real CLI** (not mocked), which constrains CI to
macOS runners with Lima. This is intentional — recordings must be authentic.

## Plan

**Approach**: Five phases, each building on the previous:

1. Recording framework refactor (extract lib.sh, per-demo scripts)
2. Additional demo scripts (list, management, headless)
3. CI pipeline (workflow_dispatch + PR comment)
4. Website asciinema player integration
5. E2E testing (dual-mode scripts)

**Key decision — React sequencer over `asciinema cat`**: The website needs
to show multiple recordings in sequence. `asciinema cat` concatenates .cast
files but transitions are abrupt and segments can't be updated independently.
A React `DemoSequence` component provides labels, crossfades, and clickable
navigation.

**Key decision — Manual CI trigger**: Recording creates real VMs on expensive
macOS runners. Auto-triggering on every PR would be wasteful. Manual
dispatch + commit-back-to-branch gives visual review in PR diffs.

## Steps

### Phase 1: Recording Framework Refactor

- [x] Create `scripts/demos/lib.sh` with extracted helpers
- [x] Create `scripts/demos/record-create.sh` (migrated storyboard)
- [x] Create `scripts/demos/record-all.sh` orchestrator
- [x] Update `scripts/record-demo.sh` to delegate
- [x] Update `docs/demo-recording.md`

### Phase 2: Additional Demo Scripts

- [x] Create `scripts/demos/record-list.sh`
- [x] Create `scripts/demos/record-management.sh`
- [x] Create `scripts/demos/record-headless.sh`

### Phase 3: CI Pipeline

- [x] Create `.github/workflows/demo-recording.yml`
- [x] Create `.github/workflows/e2e.yml`

### Phase 4: Website Player Integration

- [x] Install `asciinema-player` in docs-site
- [x] Create `AsciinemaTerminal.tsx` component
- [x] Create `DemoSequence.tsx` component
- [x] Add asciinema theme CSS
- [x] Replace static Terminal sections in App.tsx
- [x] Set up `docs-site/public/casts/` with gitignore exception
- [x] Pages workflow already covers `docs-site/**` path

### Phase 5: E2E Testing

- [x] Add dual-mode support to `lib.sh` (DEMO_MODE, assert_screen, demo_sleep)
- [x] Create `scripts/demos/test-all.sh`
- [x] Create `.github/workflows/e2e.yml`

## Notes

- The asciinema-player package (v3.15.1) doesn't ship TypeScript types.
  Added a declaration file at `docs-site/src/types/asciinema-player.d.ts`.
- Website sections gracefully fall back to static Terminal content when
  `.cast` files aren't present — this means the site works during dev without
  needing to run the recording pipeline.
- The eslint config for docs-site doesn't include react-hooks plugin, so
  we can't use `eslint-disable-next-line react-hooks/exhaustive-deps`.

## Outcome

All five phases implemented:

- **Recording framework**: `scripts/demos/lib.sh` provides shared helpers
  (setup/teardown, wait_for, assert_screen, type_slow, demo_sleep). Four
  demo scripts (create, list, management, headless) with an orchestrator.
- **CI**: Two new workflows — `demo-recording.yml` (manual trigger, records
  demos, commits GIF back to PR branch, posts comment) and `e2e.yml`
  (manual + weekly schedule, runs assertions without recording).
- **Website**: `AsciinemaTerminal` and `DemoSequence` React components wrap
  the asciinema player in the site's terminal chrome. FleetDemo,
  ManagementDemo, ConfigSection, and a new CreateDemo section use live
  recordings with static fallbacks.
- **E2E**: Dual-mode scripts (record vs test) with TAP output. The same
  storyboards serve both recording and testing.

Follow-up work needed: actually record the demos and commit `.cast` files
to `docs-site/public/casts/` so the website shows live recordings.
