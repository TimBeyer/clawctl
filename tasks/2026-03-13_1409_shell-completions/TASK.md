# Shell Completions for clawctl

## Status: Resolved

## Scope

Add bash and zsh tab-completion support for clawctl via a new `clawctl completions <shell>` command. Covers all existing commands, per-command options, dynamic instance name completion, and openclaw subcommand completion.

Does **not** cover: dynamic openclaw subcommand discovery (uses a hardcoded list), fish shell, or automatic installation of completions.

## Plan

1. Create completion script templates (`src/templates/completions/bash.ts`, `zsh.ts`, `index.ts`)
2. Create the `completions` command handler (`src/commands/completions.ts`)
3. Wire the command into `bin/cli.tsx` and `src/commands/index.ts`
4. Add unit tests (`src/templates/completions/completions.test.ts`)
5. Update `install.sh` with a post-install hint
6. Update `README.md` with command table entry and shell completions section
7. Update `docs/getting-started.md` next steps
8. Update `src/steps/finish.tsx` with completion hint

## Steps

- [x] Create `src/templates/completions/bash.ts`
- [x] Create `src/templates/completions/zsh.ts`
- [x] Create `src/templates/completions/index.ts`
- [x] Create `src/commands/completions.ts`
- [x] Update `src/commands/index.ts`
- [x] Update `bin/cli.tsx`
- [x] Create `src/templates/completions/completions.test.ts`
- [x] Update `install.sh`
- [x] Update `README.md`
- [x] Update `docs/getting-started.md`
- [x] Update `src/steps/finish.tsx`
- [x] Run tests and verify

## Notes

- Using python3 for JSON parsing in completion scripts (~30ms) vs Bun (~200ms+)
- python3 is always available on macOS
- Completion scripts are parameterized by `binName` to work with both `clawctl` and `clawctl-dev`
- Instructions printed to stderr so they don't contaminate `eval "$(...)"`

## Outcome

Delivered all planned functionality:

- **Bash completions**: `complete -F` based, with dynamic instance names via python3, per-command option completion, openclaw subcommand completion, and `--` pass-through detection
- **Zsh completions**: `compdef`/`_arguments` based with description annotations on commands and options, same dynamic instance and openclaw completion
- **`clawctl completions <shell>` command**: prints script to stdout, install hints to stderr when TTY
- **18 unit tests**: all passing, including bash `-n` syntax validation
- **Documentation**: README commands table + section, getting-started next steps, install.sh hint, finish step hint
- No deferred or descoped items
