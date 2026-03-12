# Merge Build Into Release Workflow

## Status: Resolved

## Scope

Fix the release build trigger by merging the build job into `release.yml`
and deleting the standalone `release-build.yml`. Follows up on the previous
fix (switching to `release: created` trigger) which still didn't work because
GitHub Actions suppresses all event types for draft releases.

## Plan

1. Add tag output to the release job in `release.yml`
2. Add a `build` job to `release.yml` with `needs: release`
3. Delete `release-build.yml`

## Steps

- [x] Add tag output and build job to `release.yml`
- [x] Delete `release-build.yml`
- [x] Commit and push

## Notes

- **Why the previous fix failed**: The first PR changed `release-build.yml`
  to trigger on `release: types: [created]`. This still doesn't work because
  GitHub Actions silently suppresses `created`, `edited`, and `deleted` event
  types for **draft** releases. Since `release-it` is configured with
  `"draft": true`, no event fires at all.
  Ref: https://github.com/orgs/community/discussions/7118
- **Why a single workflow works**: By making the build a downstream job in
  the same workflow (`needs: release`), no cross-workflow triggering is needed.
  The `GITHUB_TOKEN` limitation and draft-event suppression are both irrelevant.
- The tag name is passed between jobs via `git describe --tags --abbrev=0`
  and `GITHUB_OUTPUT`.

## Outcome

Deleted `release-build.yml` and merged its build logic into `release.yml`
as a `build` job that runs after `release`. The release job outputs the tag
name, the build job checks out at that tag, compiles, uploads the binary,
and publishes the release (sets `--draft=false`).
