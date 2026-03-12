# CI/CD Pipeline: PR Checks, Release Automation, Binary Artifacts

## Status: Resolved

## Scope

Set up GitHub Actions CI/CD infrastructure:

- PR checks: lint, format, test (parallel jobs)
- Conventional commit enforcement via commitlint
- Automated release on push to main: build binary, version bump, changelog, GitHub Release with binary artifact

Does NOT cover:

- Linux/cross-platform builds (future matrix extension)
- VM integration tests in CI (self-skip when env var unset)
- Branch protection rules (manual GitHub settings)

## Plan

1. Create task directory + TASK.md, commit
2. Create feature branch
3. Fix version sync in `bin/cli.tsx` (read from package.json instead of hardcoded)
4. Install devDependencies: release-it, conventional-changelog plugin, commitlint
5. Add config files: `.release-it.json`, `commitlint.config.js`, `.prettierignore`
6. Add `build:release` and `release` scripts to `package.json`
7. Add workflow files: `ci.yml`, `commitlint.yml`, `release.yml`

## Steps

- [x] Task directory + TASK.md committed
- [x] Feature branch created
- [x] `bin/cli.tsx` reads version from `package.json`
- [x] devDependencies installed
- [x] `.release-it.json` created
- [x] `commitlint.config.js` created
- [x] `.prettierignore` created
- [x] `build:release` and `release` scripts added to `package.json`
- [x] `.github/workflows/ci.yml` created
- [x] `.github/workflows/commitlint.yml` created
- [x] `.github/workflows/release.yml` created
- [x] Local validation: lint, format:check, test, build:release

## Notes

- release-it `requireCleanWorkingDir: false` needed because downloaded build artifact lives in `dist/`
- `chore: release` commit message prefix used for loop prevention in release workflow
- VM tests self-skip when `CLAWCTL_VM_TESTS` is unset, no CI exclusion needed
- Reference setup: https://github.com/TimBeyer/dancing-links

## Outcome

Delivered the full CI/CD pipeline as planned:

- Three GitHub Actions workflows: PR checks (lint/format/test), commitlint, and release automation
- release-it configured with conventional-changelog for automated version bumps, changelogs, and GitHub Releases
- Binary artifact (`clawctl-darwin-arm64.zip`) built and attached to releases
- CLI version synced dynamically from `package.json` via import
- All local checks pass: lint, format:check, test, build:release

Future: add linux targets via build matrix + extra asset entries in `.release-it.json`.
