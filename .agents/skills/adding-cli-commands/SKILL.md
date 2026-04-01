---
name: adding-cli-commands
description: "Add new CLI commands to clawctl. Use when creating a new command, subcommand group, or modifying the CLI surface. Ensures all touchpoints are updated: handler, exports, commander wiring, README, shell completions, and tests."
---

# Adding CLI Commands

When adding a new command to clawctl, **7 places** need updating.
Missing any of them causes broken completions, missing docs, or test failures.

## Checklist

1. **Command handler** — `packages/cli/src/commands/<name>.ts`
   Create `export async function runCommandName(...)`.
   For instance-targeting commands, use `requireInstance(opts)`.

2. **Barrel export** — `packages/cli/src/commands/index.ts`
   Add `export { runCommandName } from "./<name>.js"`

3. **Commander wiring** — `packages/cli/bin/cli.tsx`
   Add `.command()` block with description, options, action handler.
   Import the handler from the barrel export.

4. **README** — `README.md` (commands table, around line 66)
   Add a row with command syntax and description.

5. **Bash completions** — `packages/templates/src/completions/bash.ts`
   - Add to `local commands="..."` string (line 88)
   - Add case in `case "$cmd" in` block with command-specific options

6. **Zsh completions** — `packages/templates/src/completions/zsh.ts`
   - Add to `commands=(...)` array (around line 70)
   - Add case in `case ${words[1]} in` block with `_arguments`

7. **Completion tests** — `packages/templates/src/completions/completions.test.ts`
   Add to `ALL_COMMANDS` array (line 6)

## Conventions

See [references/cli-conventions.md](references/cli-conventions.md) for
instance resolution, positional argument rules, and subcommand patterns.

## Subcommand groups

Parent commands like `mount` and `daemon` need special handling:

- **Commander**: Create parent with `.command("name")`, add `.action(() => cmd.help())` for bare invocation, nest children under it
- **Completions**: Add the parent to the top-level commands list. Add a case that completes subcommand names. Add nested cases for each subcommand's options.
- **README**: List each subcommand as its own row
- **Tests**: Add the parent command name to `ALL_COMMANDS`

## Update check skip list

If the command shouldn't trigger the auto-update check (infrastructure commands
like `update`, `daemon`, `completions`), add it to `SKIP_UPDATE_COMMANDS` in
`cli.tsx`.
