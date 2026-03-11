# Initial Implementation

## Status: Resolved

## Scope

Implement the full create-openclaw-vm CLI tool from scratch: project structure,
all wizard steps, library modules, templates, provisioning scripts, and
documentation. Does not include end-to-end testing with an actual VM — this
task is about getting the codebase to a clean, type-checking state.

## Plan

1. Initialize project: CLAUDE.md, package.json, tsconfig.json, .gitignore
2. Install dependencies (ink, ink-text-input, ink-select-input, react, execa)
3. Build core library modules (exec, lima, homebrew, git, templates)
4. Build UI components (spinner, step-indicator, log-output)
5. Build wizard steps (welcome → configure → host-setup → create-vm → provision-status → credentials → finish)
6. Create app orchestrator and CLI entry point
7. Create provisioning script templates
8. Write all documentation
9. Type check passes clean

## Steps

- [x] Project initialization and deps
- [x] src/types.ts — shared TypeScript types
- [x] src/lib/exec.ts — execa wrapper
- [x] src/lib/homebrew.ts — Homebrew operations
- [x] src/lib/git.ts — git init + .gitignore
- [x] src/lib/lima.ts — Lima VM operations
- [x] src/lib/templates.ts — generate lima.yaml + provisioning scripts
- [x] src/components/spinner.tsx — animated spinner
- [x] src/components/step-indicator.tsx — step progress bar
- [x] src/components/log-output.tsx — streaming log display
- [x] src/steps/welcome.tsx — prereq checking
- [x] src/steps/configure.tsx — VM configuration prompts
- [x] src/steps/host-setup.tsx — install Lima
- [x] src/steps/create-vm.tsx — project setup + VM creation
- [x] src/steps/provision-status.tsx — verify provisioning
- [x] src/steps/credentials.tsx — 1Password + Tailscale
- [x] src/steps/finish.tsx — summary and next steps
- [x] src/app.tsx — wizard orchestrator
- [x] bin/cli.tsx — CLI entry point
- [x] templates/scripts/\*.sh — provisioning scripts
- [x] Clean type check (bunx tsc --noEmit)
- [x] Documentation (README.md, docs/\*.md)

## Notes

- **1Password CLI is installed as a direct arm64 binary**, not via apt or
  brew. The 1Password apt repository does not publish arm64 packages, and
  installing via brew inside the VM would add a slow extra dependency.
  Pinned to v2.30.0 — version is hardcoded in the provisioning script.

- **Provisioning scripts exist in two places**: as static `.sh` files in
  `templates/scripts/` (reference copies, useful for reading/diffing) and
  as TypeScript template literal functions in `src/lib/templates.ts` (the
  actual source of truth used at runtime). The generated project gets its
  scripts from the template literals, not from the static files.

- **`templates/lima.yaml.ts` is a re-export stub** that points at
  `src/lib/templates.ts`. The real generation logic lives in `templates.ts`
  because it needs access to the `VMConfig` type. The file exists so the
  `templates/` directory isn't misleading about where lima.yaml comes from.

- **Wizard step ordering**: If Lima is already installed, the wizard skips
  the host-setup step entirely (welcome → configure). This avoids a
  confusing "nothing to do" screen.

- **Credentials step uses `useInput` for Y/n prompts** rather than
  `ink-select-input`, since a simple keypress is faster UX than navigating
  a select menu for a binary choice.

## Outcome

Delivered the full CLI tool skeleton: 7 wizard steps, 5 lib modules, 3 UI
components, 3 provisioning scripts, and 7 documentation files. TypeScript
compiles cleanly with `bunx tsc --noEmit`.

**Not yet tested end-to-end** — the wizard renders and type-checks but has
not been run against a real VM. Follow-up work needed:

- Run the full wizard flow on a machine with Homebrew and verify VM creation
- Test idempotent re-runs (run CLI twice in the same directory)
- Test error paths (no Homebrew, network failures, existing VM with same name)
- Add `bun test` test suite
