# 1Password deep integration: secret references + zero-plaintext bootstrap

## Status: Resolved

## Scope

Add `op://` and `env://` secret reference support to clawctl configs, enabling
zero-plaintext-secrets bootstrap. Configs can be committed to git safely.

Covers:

- `src/lib/secrets.ts` — reference detection and resolution
- `env://` resolution at config-load time on the host
- `op://` resolution in the VM via `op read` (after 1Password setup)
- `--secret-input-mode ref` for openclaw onboard
- Post-onboard exec secret provider setup
- 1Password service account skill template
- Example config and documentation updates

Does NOT cover:

- Interactive wizard support for secret references
- Changes to the Zod schema (op:// strings pass existing validation)

## Plan

1. Create `src/lib/secrets.ts` + tests — core reference detection and resolution
2. Integrate `env://` into config loading + add `op://` cross-validation
3. Add `secretInputMode` to `buildOnboardCommand` + tests
4. Integrate `op://` resolution into headless flow + exec provider setup in bootstrap
5. Create skill template + install in bootstrap
6. Example config + docs

## Steps

- [x] Create `src/lib/secrets.ts` with findSecretRefs, hasOpRefs, resolveEnvRefs, resolveOpRefs
- [x] Create `src/lib/secrets.test.ts`
- [x] Integrate env:// resolution into `loadConfig()`
- [x] Add op:// cross-validation (op:// refs require onePassword service config)
- [x] Add config.test.ts cases for env:// and op:// references
- [x] Add `secretInputMode` option to `buildOnboardCommand()`
- [x] Add provider test cases for --secret-input-mode ref
- [x] Add op:// resolution step (5.5) to headless.ts
- [x] Add exec provider setup + secrets apply in bootstrap.ts
- [x] Pass secretInputMode to buildOnboardCommand in bootstrap
- [x] Move workspace mkdir earlier in bootstrap
- [x] Create skill template `src/templates/skills/op-service-account.ts`
- [x] Install skill during bootstrap
- [x] Re-export skill template from `src/templates/index.ts`
- [x] Add skill template tests
- [x] Create `example-config.op.json`
- [x] Update `docs/1password-setup.md`
- [x] Update `README.md`

## Notes

- `op://` strings pass existing Zod validation (z.string().min(1)) so no schema
  changes were needed — just cross-validation that onePassword is configured.
- The `resolveOpRefs` function parallelizes `op read` calls via `Promise.all`
  for efficiency when multiple references need resolution.
- Exec provider commands (`openclaw secrets configure`, `openclaw secrets apply`)
  are non-fatal warnings if they fail — the bootstrap continues since the core
  onboarding is already complete.

## Outcome

All six parts of the plan implemented:

1. `src/lib/secrets.ts` — findSecretRefs, hasOpRefs, resolveEnvRefs, resolveOpRefs
2. Config loading resolves env:// at load time; cross-validates op:// requires onePassword
3. `buildOnboardCommand` accepts `secretInputMode: "ref" | "plaintext"` option
4. Headless flow resolves op:// after 1Password setup; bootstrap configures exec provider
5. Skill template installed at `data/workspace/skills/1password-service-account/SKILL.md`
6. Example config, docs updated

158 tests pass, lint clean, format clean.
