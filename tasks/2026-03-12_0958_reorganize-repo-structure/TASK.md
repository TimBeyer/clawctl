# Reorganize Repo Root Structure

## Status: In Progress

## Scope

Reduce visual clutter in the repo root so the README renders closer to "above the fold" on GitHub. Currently 22 entries (6 dirs + 16 files); target is 16 entries (7 dirs + 9 files).

Does **not** cover: renaming src/ subdirectories, restructuring source code, changing the tasks/ convention, or removing CLAUDE.md from root.

## Plan

1. Move 4 `example-config.*.json` files into `examples/` (drop `example-` prefix)
2. Inline `.prettierrc`, `commitlint.config.js`, `.release-it.json` into `package.json`
3. Move `TODO.md` into `docs/`
4. Update all doc references to moved files
5. Verify tooling (format, lint, test)

## Steps

- [ ] Create `examples/` dir and `git mv` the four example configs
- [ ] Update references in README.md, docs/config-reference.md, docs/1password-setup.md, docs/architecture.md
- [ ] Add prettier, commitlint, release-it configs to package.json
- [ ] Delete .prettierrc, commitlint.config.js, .release-it.json
- [ ] Move TODO.md to docs/
- [ ] Run format:check, lint, test to verify

## Notes

- `.prettierignore` stays — no package.json equivalent exists
- `eslint.config.js` stays — ESLint flat config requires root placement
- `CLAUDE.md` stays — Claude Code expects it at root
- `tasks/` stays at root — CLAUDE.md convention mandates it
- Renaming example configs to drop `example-` prefix since the `examples/` directory name already communicates intent

## Outcome

(To be written when resolved.)
