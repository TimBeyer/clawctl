---
name: extending-capabilities
description: "Write and extend VM provisioning capabilities for clawctl. Use when adding new tools to the VM, modifying the provisioning pipeline, writing CapabilityDef modules, or working with lifecycle hooks and CapabilityContext SDK."
---

# Extending Capabilities

Capabilities are the extension mechanism for VM provisioning. Each
capability is a `CapabilityDef` module that declares what it installs,
when it runs (lifecycle phase + hook timing), and what health checks it
provides.

## Key concepts

- **CapabilityDef** — a declarative constant with `name`, `version`,
  `hooks` (keyed by lifecycle phase), optional `dependsOn`, and optional
  `migrations`.
- **Lifecycle phases** — `provision-system`, `provision-tools`,
  `provision-openclaw`, `provision-workspace`, `bootstrap`. Each phase
  supports `pre:`, main, and `post:` timing slots.
- **CapabilityContext SDK** — sandboxed interface (`ctx.exec()`,
  `ctx.fs`, `ctx.apt`, `ctx.systemd`, `ctx.net`, `ctx.profile`,
  `ctx.agentsMd`) that capabilities use for system access. Never import
  vm-cli internals directly.
- **Steps** return `ProvisionResult` (`installed` / `unchanged` /
  `failed`) and must be idempotent.
- **Doctor checks** are declared via `doctorChecks` on hooks, using
  `availableAfter` for lifecycle-aware warnings.
- **State tracking** — `capability-state.json` records installed
  versions; version changes trigger migrations or re-provision.

## Adding a new capability

1. Create a module in `packages/capabilities/src/capabilities/`
2. Export a `CapabilityDef` constant
3. Export it from `packages/capabilities/src/index.ts`
4. Register it in `packages/vm-cli/src/capabilities/registry.ts`

## Full reference

See [references/capabilities.md](references/capabilities.md) for the
complete documentation including hook timing, runner mechanics, state
tracking, migrations, core vs optional capabilities, and AGENTS.md
managed sections.
