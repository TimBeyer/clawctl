# Fix release pipeline version mismatch

## Status: Resolved

## Scope

Fix the release workflow so that the compiled binary contains the correct
version number. Currently the binary is built before `release-it` bumps the
version in `package.json`, so every release ships a binary that reports the
previous version (e.g. tag v0.4.2 ships a binary reporting v0.4.1).

Does **not** cover:

- Multi-platform builds (only darwin-arm64 today)
- Changes to install.sh (works as-is)

## Plan

1. Make `release-it` create **draft** GitHub releases (invisible to `/releases/latest`)
2. Remove the `build` job from `release.yml` — release-it only bumps, commits, tags, and creates the draft release
3. Add a new `release-build.yml` workflow triggered by tag push (`v*`) that builds the binary on macOS, uploads it to the draft release, then publishes the release
4. This guarantees the binary has the correct version (built from the tagged commit) and users never see a release without a binary

## Steps

- [x] Create task directory and TASK.md
- [x] Modify `package.json` — add `draft: true`, remove `assets` from release-it github config
- [x] Modify `.github/workflows/release.yml` — remove `build` job, rewire `release` depends on lint/format/test
- [x] Create `.github/workflows/release-build.yml` — tag-triggered build + publish workflow
- [x] Run tests, lint, format check

## Notes

- `install.sh` uses the GitHub API `/releases/latest` endpoint which only returns
  **published** (non-draft) releases. By making release-it create drafts and only
  publishing after the binary is uploaded, there's zero window where a user could
  hit a 404 on the binary download.
- The `release-build.yml` uses `gh release upload --clobber` so re-running the
  workflow replaces the asset rather than failing — safe for retries.

## Outcome

Split the release pipeline into two workflows to fix the version mismatch:

- `release.yml` now only runs CI checks and `release-it` (which bumps version,
  commits, tags, and creates a **draft** GitHub release)
- New `release-build.yml` triggers on tag push, builds the binary on macOS
  (from the tagged commit with the correct version), uploads it to the draft
  release, and publishes the release

The draft release approach ensures `install.sh` users never see a release
without a binary attached, since the `/releases/latest` API only returns
published releases.
