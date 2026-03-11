# Fix: openclaw not found + cd errors in limactl shell invocations

## Status: Resolved

## Scope

Fix three related issues that cause the onboard step to fail on a fresh VM:

1. `limactl shell` tries to cd to the host's cwd inside the VM (doesn't exist)
2. `openclaw` binary not on PATH because `.bashrc` isn't sourced properly
3. Installer runs in a subshell so PATH changes from `fix_npm_permissions` are lost

Does not change the bootstrap flow structure or wizard steps.

## Plan

1. Add `--workdir /tmp` to all `limactl shell` invocations in `src/lib/lima.ts`
2. Change `bin/cli.tsx` onboard/doctor invocations from `-- openclaw ...` to `bash -lc "openclaw ..."`
3. Fix installer to set PATH directly after install (not via `source ~/.bashrc`)
4. Put PATH/env entries in `~/.profile` (not just `.bashrc`) so non-interactive login shells pick them up
5. Change `shellExec` to `bash -lc` so it reads profile files

## Steps

- [x] Update `src/lib/lima.ts` shellExec and runProvisionScript with `--workdir /tmp`
- [x] Update `bin/cli.tsx` onboard command to use `bash -lc`
- [x] Update `bin/cli.tsx` doctor command to use `bash -lc`
- [x] Update retry hint messages in `bin/cli.tsx`
- [x] Add `ensure_in_profile` helper to `src/templates/helpers.ts`
- [x] Switch openclaw installer from `ensure_in_bashrc` to `ensure_in_profile` for PATH and env vars
- [x] Change `shellExec` from `bash -c` to `bash -lc` (login shell reads profile)
- [x] Fix installer: replace `source ~/.bashrc` with `export PATH="$HOME/.npm-global/bin:$PATH"`
- [x] Run tests
- [x] Verify fix on running VM

## Notes

- **First attempt failed**: used `bash -lc` thinking it would source `.bashrc`. It doesn't — Ubuntu's `.bashrc` has an interactive guard (`case $- in *i*) ;; *) return;;`) that skips everything in non-interactive shells. `bash -lc` is login but NOT interactive.
- **Second attempt failed**: added `source ~/.bashrc` in the installer to pick up PATH after curl install. But the interactive guard causes `return` which means PATH is never set. Then our verification step (`if ! command_exists openclaw; then exit 1; fi`) kills the script before `ensure_in_profile` runs.
- **Root fix**: After `curl | bash` installs openclaw, set PATH directly with `export PATH="$HOME/.npm-global/bin:$PATH"` — no dependency on `.bashrc` at all.
- **Profile vs bashrc**: PATH entries go in `~/.profile` (read by login shells regardless of interactivity), not `.bashrc` (interactive-only due to guard). `ensure_in_profile` also writes to `~/.bash_profile` since bash reads that instead of `~/.profile` when both exist.
- `--workdir /tmp` prevents Lima from trying to cd into the host path inside the VM
- `shellExec` now uses `bash -lc` (login shell) so profile files are sourced for all shell commands

## Outcome

All issues fixed across three iterations. The chain of bash sourcing in non-interactive contexts (provisioning scripts, `limactl shell ... bash -lc`) has several gotchas that compound: `.bashrc` interactive guard, subshell PATH loss, `~/.bash_profile` vs `~/.profile` precedence. The final solution avoids all of them by setting PATH directly after install and using `ensure_in_profile` for persistence.
