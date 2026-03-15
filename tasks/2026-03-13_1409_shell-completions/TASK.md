# Shell Completions for clawctl

## Status: Resolved

## Scope

Add bash and zsh tab-completion support for clawctl via a new `clawctl completions <shell>` command. Covers all existing commands, per-command options, dynamic instance name completion, and openclaw subcommand completion.

Does **not** cover: fish shell or automatic installation of completions into shell rc files.

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
- [x] Cache openclaw's own completion scripts via `clawctl completions update-oc`
- [x] Auto-populate cache on first `completions` invocation if a VM is running
- [x] Background refresh on VM-interacting commands when cache is stale (>24h)
- [x] Add refresh to `start.ts`, `restart.ts`, `shell.ts`, `openclaw.ts`, `create.ts`

## Notes

- Using python3 for JSON parsing in completion scripts (~30ms) vs Bun (~200ms+)
- python3 is always available on macOS
- Completion scripts are parameterized by `binName` to work with both `clawctl` and `clawctl-dev`
- Instructions printed to stderr so they don't contaminate `eval "$(...)"`

## Outcome

Delivered all planned functionality plus openclaw completion caching:

- **Bash completions**: `complete -F` based, with dynamic instance names via python3, per-command option completion, openclaw subcommand completion, and `--` pass-through detection
- **Zsh completions**: `compdef`/`_arguments` based with description annotations on commands and options, same dynamic instance and openclaw completion
- **`clawctl completions <shell>` command**: prints script to stdout, install hints to stderr when TTY
- **Openclaw completion caching**: `clawctl completions update-oc` fetches completion scripts from the VM; cached at `~/.config/clawctl/oc-completions.{bash,zsh}`
- **Auto-refresh**: cache auto-populates on first `completions` invocation if a running VM is available; stale caches (>24h) refresh in the background on `start`, `restart`, `shell`, `openclaw`, and `create` commands
- **22 unit tests**: all passing, including bash `-n` syntax validation
- **Documentation**: README commands table + section, getting-started next steps, install.sh hint, finish step hint
- No deferred or descoped items
