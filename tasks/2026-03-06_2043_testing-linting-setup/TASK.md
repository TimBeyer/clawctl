# Testing & linting setup for clawctl

## Status: Resolved

## Scope

Set up a testing and code quality foundation for clawctl:

- ESLint + Prettier for linting and formatting
- Unit tests for all 13 template generators (bash -n validation, key content checks)
- Extract and test parsing logic (gateway token extraction, lima version parsing)
- VM provisioning integration tests (gated behind `test:vm`)
- Testing strategy documentation

Does NOT cover: CI/CD pipeline, pre-commit hooks, snapshot-based tests, stub openclaw tests, or full e2e tests.

## Plan

1. Install ESLint + Prettier, create config files, add scripts to package.json
2. Write template generator unit tests (src/templates/templates.test.ts)
3. Extract parsing functions to src/lib/parse.ts, update callers
4. Write parsing unit tests (src/lib/parse.test.ts)
5. Create VM provisioning test file (tests/vm/provision.test.ts)
6. Write docs/testing.md
7. Update CLAUDE.md with new commands

## Steps

- [x] Create eslint.config.js
- [x] Create .prettierrc
- [x] Install dev dependencies (eslint, prettier, typescript-eslint)
- [x] Add lint/format scripts to package.json
- [x] Create src/templates/templates.test.ts
- [x] Create src/lib/parse.ts with extractGatewayToken and parseLimaVersion
- [x] Update bin/cli.tsx to use parse.ts
- [x] Update src/lib/homebrew.ts to use parse.ts
- [x] Create src/lib/parse.test.ts
- [x] Create tests/vm/provision.test.ts
- [x] Create docs/testing.md
- [x] Update CLAUDE.md
- [x] Run bun test and verify everything passes
- [x] Run lint and format:check

## Notes

- `generateHelpersScript` is a sourced library (not directly executed), so it has a shebang but no `set -euo pipefail`. Tested separately from the other bash generators which all have the full preamble.
- Fixed 4 pre-existing lint errors (unused imports/variables) in app.tsx, lima.ts, configure.tsx, and create-vm.tsx to get ESLint passing clean.
- Prettier formatted 45 files on first run — the codebase was using a mix of styles. All now consistent with the `.prettierrc` config.
- `create-vm.tsx` had `logs` state that was never read (only `setLogs` via `addLog`). Renamed to `_logs` to satisfy the unused-vars lint rule while keeping the setter in use.

## Outcome

- **Delivered**: Full linting/formatting setup (ESLint flat config + Prettier), 71 passing unit tests (templates + parsing), VM provisioning test scaffold (gated by `CLAWCTL_VM_TESTS=1`), testing strategy docs.
- **Test coverage**: All 13 template generators tested for preamble, key content, and bash syntax. 12 parsing tests across 2 functions. Pre-existing exec/hooks tests continue passing.
- **Deferred**: CI/CD integration, pre-commit hooks, snapshot-based tests, stub openclaw.
