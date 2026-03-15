# VM-Side CLI (`claw`) — v1

## Status: Resolved

## Scope

Replace bash provisioning scripts with a TypeScript CLI (`claw`) that runs
inside the VM as a compiled Bun binary. Adds structured output, health checks
(`claw doctor`), and a checkpoint signaling mechanism.

**In scope:**

- New `@clawctl/vm-cli` package with Commander-based CLI
- `claw provision system|tools|openclaw` — replace bash template scripts
- `claw doctor` — structured health checks
- `claw checkpoint` — signal file for host-side auto-commit
- Host-side `provision.ts` rewrite to call `claw` instead of bash
- Host-side `verify.ts` simplified to use `claw doctor`
- `clawctl watch` command for auto-commit on checkpoint signals
- Remove dead template code (provisioning generators)
- Build script for cross-compiling to linux-arm64

**Out of scope:**

- Agent integration beyond checkpoint signaling
- Tailscale `up` configuration (separate from install)
- Changes to the wizard UI flow

## Plan

1. Package skeleton — vm-cli package, Commander setup, output module, exec wrapper
2. Provision commands — port each installer from bash to TypeScript
3. Doctor command — structured health checks
4. Checkpoint command — atomic signal file writing
5. Host-side wiring — provision.ts, verify.ts, deploy claw binary, build script
6. Watch command — clawctl watch with fs.watch + git auto-commit
7. Cleanup — remove dead template code and exports

## Steps

- [x] Create `packages/vm-cli/` package skeleton (package.json, bin/claw.ts)
- [x] Implement output module (JSON envelope + human formatting)
- [x] Implement exec wrapper (same pattern as host-core/exec.ts)
- [x] Implement provision helpers (commandExists, ensureAptPackages, etc.)
- [x] Implement `claw provision system`
- [x] Implement `claw provision tools`
- [x] Implement `claw provision openclaw`
- [x] Implement `claw doctor`
- [x] Implement `claw checkpoint`
- [x] Add new constants to `@clawctl/types`
- [x] Rewrite `provision.ts` to deploy+call claw
- [x] Simplify `verify.ts` to use claw doctor
- [x] Add `build:claw` script to root package.json
- [x] Implement `clawctl watch` command
- [x] Wire watch into cli.tsx
- [x] Remove dead template files and exports
- [x] Run tests and verify build

## Notes

- The claw binary cross-compiles to ~98MB for linux-arm64 (within expected 50-90MB range, Bun runtime overhead)
- `templates/src/installers/` directory removed entirely — all 12 provisioning generator files deleted
- Templates package retains: lima-yaml, bootstrap-prompt, exec-approvals, skills/_, completions/_
- The `downloadAndRun` helper downloads to a temp file first rather than piping curl to bash — more reliable for error handling
- `provision.ts` now has a 3-phase claw approach (system as root, tools as user, openclaw as user) instead of the 2-phase bash approach (provision-system.sh, provision-user.sh)

## Outcome

All deliverables from the plan implemented:

- **`@clawctl/vm-cli` package** with Commander-based CLI, structured JSON output, and 3 command groups (provision, doctor, checkpoint)
- **`claw provision system|tools|openclaw`** replaces 12 bash template generators with idempotent TypeScript using execa
- **`claw doctor`** runs 5 check categories (mount, env, path, service, openclaw) with `--json` support
- **`claw checkpoint`** writes atomic signal files with tmp+rename pattern
- **Host-side `provision.ts`** deploys claw binary from mount, calls `claw provision` subcommands with `--json`
- **Host-side `verify.ts`** delegates entirely to `claw doctor --json`, parsing structured output
- **`clawctl watch`** monitors checkpoint signal files with fs.watch (plus `--poll` fallback for virtiofs quirks), auto-commits data changes
- **`build:claw` script** cross-compiles to linux-arm64 standalone binary
- **Cleanup**: 12 template files and 2 orchestrator scripts deleted, tests updated, all 244 tests pass, lint clean
