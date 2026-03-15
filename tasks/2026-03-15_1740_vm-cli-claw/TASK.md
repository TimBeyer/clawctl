# VM-Side CLI (`claw`) — v1

## Status: In Progress

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

- [ ] Create `packages/vm-cli/` package skeleton (package.json, bin/claw.ts)
- [ ] Implement output module (JSON envelope + human formatting)
- [ ] Implement exec wrapper (same pattern as host-core/exec.ts)
- [ ] Implement provision helpers (commandExists, ensureAptPackages, etc.)
- [ ] Implement `claw provision system`
- [ ] Implement `claw provision tools`
- [ ] Implement `claw provision openclaw`
- [ ] Implement `claw doctor`
- [ ] Implement `claw checkpoint`
- [ ] Add new constants to `@clawctl/types`
- [ ] Rewrite `provision.ts` to deploy+call claw
- [ ] Simplify `verify.ts` to use claw doctor
- [ ] Add `build:claw` script to root package.json
- [ ] Implement `clawctl watch` command
- [ ] Wire watch into cli.tsx
- [ ] Remove dead template files and exports
- [ ] Run tests and verify build

## Notes

## Outcome
