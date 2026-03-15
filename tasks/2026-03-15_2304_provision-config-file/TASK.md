# Provision Config File: Host Tells VM What to Provision

## Status: Resolved

## Scope

Host writes `data/provision.json` before provisioning so claw knows which optional tools to install. Wizard flow reordered so credentials are collected before VM creation (enabling provision config to be written), with a separate credential-setup step after VM for validation/connection.

Covers:

- `ProvisionConfig` type in `@clawctl/types`
- Host writes `provision.json` before claw stages
- VM reads config and gates op-cli and tailscale installation
- Wizard reorder: credentials before create-vm, credential-setup after provision
- Headless flow writes provision config from existing config

Does NOT cover:

- Additional feature flags beyond onePassword/tailscale
- Changes to doctor checks or verification

## Plan

1. Add `ProvisionConfig` type and `PROVISION_CONFIG_FILE` constant to `@clawctl/types`
2. Create `vm-cli/src/tools/provision-config.ts` — reads config from mount
3. Gate tailscale in `system.ts` and op-cli in `tools.ts` on provision config
4. Add `ProvisionFeatures` to `host-core/provision.ts`, write `provision.json`
5. Add `credential-setup` wizard step, split credentials into collect vs setup
6. Reorder wizard flow in `app.tsx`
7. Update headless flow to write provision config

## Steps

- [x] `@clawctl/types`: add ProvisionConfig + PROVISION_CONFIG_FILE
- [x] `vm-cli`: create provision-config.ts reader
- [x] `vm-cli`: gate tools.ts (op-cli) on provision config
- [x] `vm-cli`: gate system.ts (tailscale) on provision config
- [x] `host-core`: add ProvisionFeatures, write provision.json in provisionVM
- [x] `cli`: add credential-setup to WizardStep union
- [x] `cli`: create credential-setup.tsx step
- [x] `cli`: refactor credentials.tsx to only collect (no VM operations)
- [x] `cli`: reorder app.tsx wizard flow
- [x] `cli`: pass provision features through create-vm step
- [x] `host-core`: update headless.ts to write provision config
- [x] Verify: bun test + lint + format

## Notes

## Outcome

Implemented as planned. Key changes:

- **`@clawctl/types`**: Added `ProvisionConfig` interface and `PROVISION_CONFIG_FILE` constant
- **`vm-cli/src/tools/provision-config.ts`**: New module reads `provision.json` from the mount, defaults to `false` if missing
- **`vm-cli` stages**: `system.ts` gates tailscale, `tools.ts` gates op-cli on provision config. Workspace steps (`workspace.ts`) already auto-detect op presence, so no changes needed there
- **`host-core/provision.ts`**: `provisionVM()` accepts `ProvisionFeatures`, writes `data/provision.json` in Phase 1 before VM creation
- **`host-core/headless.ts`**: Derives features from `config.services.onePassword` and `config.network.tailscale`
- **`cli` wizard**: Reordered to 9 steps. `credentials.tsx` now only collects tokens (no VM ops). New `credential-setup.tsx` handles VM-side validation/connection after provisioning. `create-vm.tsx` passes provision features through. All step indicators updated to `/9`
