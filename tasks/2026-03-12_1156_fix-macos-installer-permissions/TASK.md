# Fix macOS installer to use ~/.local/bin by default

## Status: In Progress

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

- [ ] Update `DEFAULT_INSTALL_DIR` to `${HOME}/.local/bin`
- [ ] Add `mkdir -p` before install
- [ ] Add `setup_path` function for shell rc files
- [ ] Update permission error message
- [ ] Update verify_install messages
- [ ] Syntax-check with `bash -n`

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

(To be written when resolved)
