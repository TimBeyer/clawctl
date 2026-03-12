# Add curl-to-bash Install Script

## Status: Resolved

## Scope

Add a POSIX-compatible install script that lets users install clawctl via
`curl -fsSL <url> | bash`. The script detects the platform, downloads the
latest GitHub Release asset, and installs the binary. It also supports
updating an existing installation.

Out of scope: multi-platform builds (only darwin-arm64 for now), Homebrew
tap, npm publishing.

## Plan

1. Create `install.sh` at repo root (POSIX sh, no bash-isms)
2. Update README.md with install instructions
3. Update Prerequisites to remove Bun (dev-only dependency)

## Steps

- [x] Create `install.sh` with platform detection, download, install, update logic
- [x] Update README.md with Install section and revised Prerequisites
- [x] Verify script structure

## Notes

- Script is hosted via GitHub raw URL: `https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh`
- No website needed — raw GitHub serves the script directly
- Release assets already follow `clawctl-{os}-{arch}.zip` naming convention
- GitHub API `/releases/latest` provides the tag; download URL is constructed from that
- No jq dependency — tag extracted with grep/sed
- Script doesn't auto-escalate to sudo; suggests it on permission denied

## Outcome

- Created `install.sh` at repo root — POSIX sh, no dependencies beyond curl/wget and unzip
- Script detects platform, fetches latest release tag from GitHub API, downloads the right asset, extracts and installs
- Supports updates: compares installed version via `--version` and skips if already current
- README updated with Install section and Bun removed from Prerequisites (dev-only dependency)
- Install dir configurable via `INSTALL_DIR` env var, defaults to `/usr/local/bin`
- No auto-sudo — suggests it on permission denied
