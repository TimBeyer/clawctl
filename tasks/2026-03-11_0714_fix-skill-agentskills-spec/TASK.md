# Fix 1Password skill to match AgentSkills spec

## Status: Resolved

## Scope

Rename the `1password-service-account` skill to `secret-management` and add
YAML frontmatter per the AgentSkills specification. The current name violates
the spec (starts with a digit, implementation-focused rather than
capability-focused) and has no frontmatter.

Does NOT change the skill's content or behavior — only naming, directory, and
frontmatter.

## Plan

1. Rename `op-service-account.ts` → `secret-management.ts`, add YAML frontmatter, rename generator function
2. Update `src/templates/index.ts` import/export
3. Update `src/lib/bootstrap.ts` import, directory name, function name, log messages
4. Update `src/templates/templates.test.ts` import, function name, assertions
5. Update `docs/1password-setup.md` skill path reference

## Steps

- [x] Create new template file with frontmatter
- [x] Update index.ts export
- [x] Update bootstrap.ts
- [x] Update test file
- [x] Update docs
- [x] Run tests, lint, format check

## Notes

- AgentSkills spec requires: lowercase a-z + hyphens, no leading digits, name must match directory name
- Frontmatter fields: `name` (required), `description` (required), `compatibility` (optional)

## Outcome

Renamed skill from `1password-service-account` to `secret-management` and added
YAML frontmatter with `name`, `description`, and `compatibility` fields per the
AgentSkills spec. All references updated across templates, bootstrap, tests, and
docs. Tests updated to assert frontmatter presence. All 183 tests pass, lint and
format clean.
