# Capability package boundary refactor

## Status: Pending

## Scope

Restructure the capabilities package so that:

1. The **registry** (application wiring) moves out of the capabilities package
2. **Helpers that are SDK primitives** (apt, systemd, node, etc.) become methods on
   ProvisionContext — owned by vm-cli, declared in types
3. **Helpers that are capability-specific** (op-cli, skills templates) are colocated
   with their capability
4. **AGENTS.md management** becomes an SDK action on ProvisionContext
5. The `capabilities` package contains only: capability definitions, the runner,
   state tracking, and the CapabilityDef interface

Does NOT cover: making capabilities dynamically discoverable (future plugin loader),
changing the lifecycle phases, or modifying the host-core integration.

## Plan

### 1. Expand ProvisionContext with SDK abstractions

Add to the `ProvisionContext` interface in `packages/types/src/capability.ts`:

```typescript
apt: {
  isInstalled: (pkg: string) => Promise<boolean>;
  ensure: (packages: string[]) => Promise<ProvisionResult>;
};
node: {
  provision: () => Promise<ProvisionResult>;
};
systemd: {
  findDefaultUser: () => Promise<string>;
  isEnabled: (service: string) => Promise<boolean>;
  isActive: (service: string) => Promise<boolean>;
  daemonReload: () => Promise<void>;
  enable: (service: string) => Promise<void>;
  provisionLinger: () => Promise<ProvisionResult>;
};
homebrew: {
  provision: () => Promise<ProvisionResult>;
};
tailscale: {
  provision: () => Promise<ProvisionResult>;
};
openclaw: {
  provision: () => Promise<ProvisionResult>;
  provisionEnvVars: () => Promise<ProvisionResult>;
  provisionNpmGlobalPath: () => Promise<ProvisionResult>;
  provisionGatewayStub: () => Promise<ProvisionResult>;
};
skills: {
  write: (name: string, content: string) => Promise<ProvisionResult>;
};
agentsMd: {
  update: (owner: string, content: string) => Promise<void>;
};
```

Phase-scoped availability is a future enhancement (tracked as a note, not in scope).

### 2. Implement SDK methods in vm-cli

In `packages/vm-cli/src/capabilities/context.ts`, implement each new SDK method
by moving the logic from the current `capabilities/src/helpers/` into the context
factory. The existing vm-cli tools (`tools/apt.ts`, `tools/systemd.ts`, etc.)
remain as the underlying implementation — the context just delegates to them.

### 3. Move registry to vm-cli

Move `packages/capabilities/src/registry.ts` → `packages/vm-cli/src/capabilities/registry.ts`.

The registry imports all capability definitions and exports `ALL_CAPABILITIES`,
`isEnabled`, `getEnabledCapabilities`, `getHooksForPhase`.

Update `packages/vm-cli/src/commands/provision/index.ts` and
`packages/vm-cli/src/commands/doctor.ts` to import from the local registry
instead of `@clawctl/capabilities`.

The `@clawctl/capabilities` package stops exporting registry functions.

### 4. Delete helpers directory

Remove `packages/capabilities/src/helpers/` entirely. All logic has moved to
either the SDK context (step 2) or been colocated with capabilities (step 5).

### 5. Colocate capability-specific logic

For capabilities where the helper is single-use and not an SDK primitive:

- **checkpoint**: Inline `checkpointSkillContent()` directly in
  `capabilities/checkpoint.ts`. Capability calls `ctx.skills.write(name, content)`
  with the inline template.

- **one-password**: Promote to directory `capabilities/one-password/index.ts`.
  Move op-cli install, wrapper, and exec-approvals logic into
  `capabilities/one-password/op-cli.ts`. Move `secretManagementSkillContent()`
  into `capabilities/one-password/skill.ts`. The capability module imports from
  its own directory.

- **tailscale**: Inline — just calls `ctx.tailscale.provision()`. No local helpers
  needed.

- **system-base**: Inline — calls `ctx.apt.ensure()`, `ctx.node.provision()`,
  `ctx.systemd.provisionLinger()`. No local helpers needed.

- **homebrew**: Inline — calls `ctx.homebrew.provision()` + `ctx.profile.ensurePath()`.
  No local helpers needed.

- **openclaw**: Inline — calls `ctx.openclaw.*` methods. No local helpers needed.

### 6. Refactor AGENTS.md to SDK action

- Remove `packages/capabilities/src/agents-md.ts`
- The runner calls `ctx.agentsMd.update(cap.name, cap.agentsMdSection)` for each
  capability that has a section, during the `provision-workspace` phase
- The vm-cli context implementation handles markers, idempotent replacement, etc.
- The runner no longer needs to import `writeAgentsMd` or `getEnabledCapabilities`
  for AGENTS.md purposes

### 7. Update capabilities package exports

`packages/capabilities/src/index.ts` exports only:
- Capability definitions (the constant objects)
- `runPhase` (the runner)
- State functions (read/write/migrate)
- Pure utility functions (`basePhase`, `hookTiming`) if still needed by consumers

It does NOT export registry functions (`ALL_CAPABILITIES`, `getEnabledCapabilities`,
`getHooksForPhase`, `isEnabled`). Those live in vm-cli now.

### 8. Update tests

- Move registry tests to vm-cli
- Capability definitions remain testable via direct import
- State tests stay in capabilities package

### 9. Verify build and tests pass

- `bun run lint`
- `bun test`
- Ensure no circular dependencies between packages

## Steps

- [ ] Expand ProvisionContext interface in types
- [ ] Implement SDK methods in vm-cli context
- [ ] Move registry to vm-cli
- [ ] Colocate one-password helpers into capability directory
- [ ] Inline skill content into checkpoint capability
- [ ] Simplify remaining capabilities to use ctx SDK methods
- [ ] Refactor AGENTS.md to SDK action
- [ ] Delete helpers directory
- [ ] Update capabilities package exports
- [ ] Move registry tests to vm-cli
- [ ] Verify build and tests

## Notes

- The `ProvisionContext` interface is getting larger but that's intentional —
  it's the VM's contract with capabilities. As the SDK matures, we can split
  it into facets (e.g., `ctx.apt` available only in root phases, `ctx.agentsMd`
  only in workspace phase) using conditional types.

- op-cli helper functions (`provisionOpWrapper`, `provisionExecApprovals`) are
  1Password-specific, not generic SDK operations. They stay with the capability.
  They still use `ctx.exec`, `ctx.fs` — that's fine. The goal isn't to eliminate
  exec, it's to not force capabilities to implement platform primitives.

- systemd helpers like `isEnabled`, `daemonReload`, `enable` are used by both
  system-base (linger) and openclaw (gateway stub). Putting them on the SDK
  context means both capabilities can use them without importing shared helpers.

- The `openclaw` helper's `provisionGatewayStub` imports systemd helpers directly.
  On the SDK, this becomes `ctx.systemd.daemonReload()` etc., cleanly avoiding
  cross-helper imports.

## Outcome

(To be written when resolved.)
