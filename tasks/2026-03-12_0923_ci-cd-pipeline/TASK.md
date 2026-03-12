# CI/CD Pipeline: PR Checks, Release Automation, Binary Artifacts

## Status: In Progress

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

- [ ] Task directory + TASK.md committed
- [ ] Feature branch created
- [ ] `bin/cli.tsx` reads version from `package.json`
- [ ] devDependencies installed
- [ ] `.release-it.json` created
- [ ] `commitlint.config.js` created
- [ ] `.prettierignore` created
- [ ] `build:release` and `release` scripts added to `package.json`
- [ ] `.github/workflows/ci.yml` created
- [ ] `.github/workflows/commitlint.yml` created
- [ ] `.github/workflows/release.yml` created
- [ ] Local validation: lint, format:check, test, build:release

## Notes

- release-it `requireCleanWorkingDir: false` needed because downloaded build artifact lives in `dist/`
- `chore: release` commit message prefix used for loop prevention in release workflow
- VM tests self-skip when `CLAWCTL_VM_TESTS` is unset, no CI exclusion needed
- Reference setup: https://github.com/TimBeyer/dancing-links

## Outcome

(To be written on resolution)
