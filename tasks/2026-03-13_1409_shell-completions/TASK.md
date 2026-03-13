# Shell Completions for clawctl

## Status: In Progress

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

- [ ] Create `src/templates/completions/bash.ts`
- [ ] Create `src/templates/completions/zsh.ts`
- [ ] Create `src/templates/completions/index.ts`
- [ ] Create `src/commands/completions.ts`
- [ ] Update `src/commands/index.ts`
- [ ] Update `bin/cli.tsx`
- [ ] Create `src/templates/completions/completions.test.ts`
- [ ] Update `install.sh`
- [ ] Update `README.md`
- [ ] Update `docs/getting-started.md`
- [ ] Update `src/steps/finish.tsx`
- [ ] Run tests and verify

## Notes

- Using python3 for JSON parsing in completion scripts (~30ms) vs Bun (~200ms+)
- python3 is always available on macOS
- Completion scripts are parameterized by `binName` to work with both `clawctl` and `clawctl-dev`
- Instructions printed to stderr so they don't contaminate `eval "$(...)"`

## Outcome

(to be filled on completion)
