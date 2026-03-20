# Expand Demo Recording: CI, Website, E2E

## Status: In Progress

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

See `/Users/tim/.claude/plans/mutable-crunching-squid.md` for the full plan.

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

- [ ] Create `scripts/demos/lib.sh` with extracted helpers
- [ ] Create `scripts/demos/record-create.sh` (migrated storyboard)
- [ ] Create `scripts/demos/record-all.sh` orchestrator
- [ ] Update `scripts/record-demo.sh` to delegate
- [ ] Update `docs/demo-recording.md`

### Phase 2: Additional Demo Scripts

- [ ] Create `scripts/demos/record-list.sh`
- [ ] Create `scripts/demos/record-management.sh`
- [ ] Create `scripts/demos/record-headless.sh`

### Phase 3: CI Pipeline

- [ ] Create `.github/workflows/demo-recording.yml`

### Phase 4: Website Player Integration

- [ ] Install `asciinema-player` in docs-site
- [ ] Create `AsciinemaTerminal.tsx` component
- [ ] Create `DemoSequence.tsx` component
- [ ] Add asciinema theme CSS
- [ ] Replace static Terminal sections in App.tsx
- [ ] Set up `docs-site/public/casts/` with gitignore exception
- [ ] Update Pages workflow path triggers

### Phase 5: E2E Testing

- [ ] Add dual-mode support to `lib.sh`
- [ ] Create `scripts/demos/test-all.sh`
- [ ] Create `.github/workflows/e2e.yml`

## Notes

## Outcome
