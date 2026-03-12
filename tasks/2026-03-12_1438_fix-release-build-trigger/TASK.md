# Fix Release Build Trigger

## Status: In Progress

## Scope

Fix the release-build workflow so it actually triggers after `release-it`
creates a draft release. Out of scope: changing the release.yml workflow or
the release-it configuration.

## Plan

1. Change `release-build.yml` trigger from `push: tags` to `release: types: [created]`
2. Update `github.ref_name` references to `github.event.release.tag_name`

## Steps

- [ ] Update trigger in `.github/workflows/release-build.yml`
- [ ] Update tag ref expressions
- [ ] Commit and push

## Notes

- **Root cause**: `release-it` pushes the tag using the default `GITHUB_TOKEN`.
  GitHub Actions intentionally won't trigger other workflows from events created
  by `GITHUB_TOKEN` (to prevent infinite loops). So the `push: tags: v*` trigger
  on `release-build.yml` never fires.
- **Fix rationale**: `release-it` also creates a draft GitHub release via the API,
  which emits a `release` event with type `created`. Triggering on that event
  sidesteps the `GITHUB_TOKEN` limitation because the release event is a distinct
  event type, not a push.
- Considered using a PAT or GitHub App token instead, but that adds secret
  management overhead for no benefit when the `release` event trigger works.

## Outcome

(pending)
