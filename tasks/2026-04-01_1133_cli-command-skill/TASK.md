# CLI command skill + fix missing mount completions/README

## Status: Resolved

## Scope

1. Create a skill that guides adding new CLI commands — ensures all touchpoints are updated
2. Move CLI command conventions from `docs/architecture.md` into the skill
3. Add `mount` to README commands table, shell completions, and completion tests

## Context

When the `clawctl mount` command was added, the README and shell completions were missed. There are 7 places that need updating when adding a CLI command, and no single reference that lists them all. A skill solves this by being loaded whenever someone is working on CLI commands.

## Plan

Create `.agents/skills/adding-cli-commands/` with a SKILL.md that contains the full checklist and conventions (instance resolution, positional args, subcommand groups). Move the CLI conventions section from `docs/architecture.md` into the skill's reference doc, and link back. Then fix the `mount` command gaps.

## Steps

- [x] Create the skill with checklist and conventions
- [x] Add `mount` to README commands table
- [x] Add `mount` to bash/zsh completions and test
- [x] Lint, format, test, commit
