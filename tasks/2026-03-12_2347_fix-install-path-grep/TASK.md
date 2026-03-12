# Fix: install.sh falsely detects ~/.local/bin in PATH config

## Status: In Progress

## Scope

Fix a substring-match bug in `install.sh`'s `setup_path()` function where
`grep -qF '.local/bin'` matches `/usr/local/bin`, causing the script to skip
adding `~/.local/bin` to shell rc files.

Does **not** cover the in-VM helpers (`src/templates/helpers.ts`), which already
use the full line for matching.

## Plan

1. Change the grep pattern on line 153 from `.local/bin` to `$HOME/.local/bin`
2. Run existing tests to confirm nothing breaks
3. Verify the fix manually with a test file

## Steps

- [ ] Fix grep pattern in `install.sh` line 153
- [ ] Run `bun test`
- [ ] Manual verification

## Notes

- `PATH_LINE` (line 141) writes `export PATH="$HOME/.local/bin:$PATH"`, so
  grepping for literal `$HOME/.local/bin` matches exactly what we write and
  won't false-positive on `/usr/local/bin`.
- Using `-qF` (fixed string) means `$HOME` is matched literally, not expanded —
  which is correct since the rc file contains the literal string `$HOME`.

## Outcome
