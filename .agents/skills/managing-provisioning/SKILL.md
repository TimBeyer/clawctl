---
name: managing-provisioning
description: "Understand and modify the VM provisioning workflow. Use when working on the host-side provisioning sequence, understanding what each phase installs, debugging provisioning failures, or modifying the idempotency/verification flow."
---

# Managing Provisioning

Provisioning installs all system packages, user tools, and OpenClaw
inside the VM. It's driven by the `claw` binary and orchestrated by the
host via `host-core/src/provision.ts`.

## Provisioning sequence

1. Create project directory + git repo on the host
2. Create/start the Lima VM
3. Deploy `claw` binary into the VM
4. `sudo claw provision system` — APT packages, Node.js, systemd linger, Tailscale
5. `claw provision tools` — Homebrew, 1Password CLI, shell profile
6. `claw provision openclaw` — OpenClaw CLI, env vars, gateway stub
7. `claw provision workspace` — skills, workspace files
8. `claw doctor` — verify provisioning
9. `openclaw onboard` — interactive or headless
10. `claw provision bootstrap` — post-onboard hooks (AGENTS.md sections)

## Key properties

- **Idempotent** — each capability step checks current state before
  acting; re-running is a fast no-op
- **Capability-driven** — provisioning logic lives in `CapabilityDef`
  modules, not in the host or provision commands
- **Verifiable** — `claw doctor` checks health with lifecycle-aware
  warnings (`availableAfter`)
- **State-tracked** — `data/capability-state.json` records installed
  versions; supports migrations

## Full reference

See [references/vm-provisioning.md](references/vm-provisioning.md) for
the complete documentation including what each phase installs,
verification details, re-running provisioning, and troubleshooting.
