# Fix macOS installer to use ~/.local/bin by default

## Status: Resolved

## Scope

Change `install.sh` to install to `~/.local/bin` instead of `/usr/local/bin` so
users don't need `sudo`. Automatically configure PATH in shell rc files.

Does NOT cover: Linux support, fish shell support, Windows.

## Plan

1. Change default install dir to `~/.local/bin`
2. Create the directory if it doesn't exist
3. Add PATH setup for `~/.zshrc` and `~/.bashrc` (idempotent)
4. Update user-facing messages
5. Keep `INSTALL_DIR` env var override working

## Steps

- [x] Update `DEFAULT_INSTALL_DIR` to `${HOME}/.local/bin`
- [x] Add `mkdir -p` before install
- [x] Add `setup_path` function for shell rc files
- [x] Update permission error message
- [x] Update verify_install messages
- [x] Syntax-check with `bash -n`

## Notes

- Research shows `~/.local/bin` is the XDG-compliant convention for user-space
  installs. Tools like Bun, Deno, Rust use tool-specific dirs (`~/.bun/bin`,
  etc.), but those are ecosystem tools. For standalone CLIs, `~/.local/bin` is
  the emerging standard.
- macOS defaults to zsh since Catalina, so `.zshrc` is the primary target.
  We also handle `.bashrc` for users who've switched shells.
- The codebase already uses `~/.local/bin` for in-VM installs
  (`src/templates/installers/shell-profile.ts`), so this is consistent.

## Outcome

- Default install dir changed from `/usr/local/bin` to `~/.local/bin`
- Installer creates `~/.local/bin` via `mkdir -p` if it doesn't exist
- New `setup_path` function appends PATH export to `~/.zshrc` and `~/.bashrc`
  (idempotent — checks for existing `.local/bin` reference before appending)
- Skips PATH setup when user provides custom `INSTALL_DIR`
- Simplified permission error message (removed sudo suggestion)
- Verify step tells user to restart shell when `~/.local/bin` isn't in current PATH
