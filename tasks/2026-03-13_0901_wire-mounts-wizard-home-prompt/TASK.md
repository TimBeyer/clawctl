# Wire Up Mounts + Wizard Home Dir Prompt (Issue #13)

## Status: Resolved

## Scope

Wire up the existing `mounts` config field so extra host directories are mounted
read-only in the VM. Add a wizard prompt so interactive users can opt in to
mounting their home directory. Update stale docs.

Out of scope: writable extra mounts, mount-point customization.

## Plan

1. Add `extraMounts?: string[]` to `VMConfig` and `VMCreateOptions`
2. Add `extraMounts` support + `guestMountPoint()` helper to lima-yaml template
3. Add Y/n home mount prompt to wizard configure step
4. Pass `extraMounts` through create-vm step and headless path
5. Wire `config.mounts` → `VMConfig.extraMounts` in `configToVMConfig()`
6. Fix stale docs
7. Add tests

## Steps

- [x] Types: `VMConfig.extraMounts`, `VMCreateOptions.extraMounts`
- [x] Lima YAML: `LimaYamlOptions.extraMounts`, `guestMountPoint()`, conditional mount entries
- [x] Wizard: Y/n prompt in configure step
- [x] create-vm.tsx: pass `extraMounts` to `provisionVM()`
- [x] headless.ts: pass `extraMounts` in createOptions
- [x] config.ts: map `config.mounts` → `extraMounts`
- [x] docs/project-directory.md: remove stale `~` mount
- [x] docs/config-reference.md: update `mounts` section
- [x] Tests: extra mounts, guestMountPoint, configToVMConfig mounts

## Notes

- The lima driver already passes `options` straight to `generateLimaYaml()`, so
  adding `extraMounts` to the options types makes it flow through without any
  changes to `lima.ts`.
- Wizard defaults to No for home mount (capital N in `[y/N]`) — entering
  without typing defaults to not mounting, matching the principle of least
  surprise.
- Moved ssh/hostResolver sections out of the first `dedent` block in
  `generateLimaYaml` so extra mounts can be appended to the mounts block
  cleanly before those sections.

## Outcome

All planned changes delivered:
- `extraMounts` wired end-to-end through types, template, wizard, headless, and
  config paths
- `guestMountPoint()` helper exported for mapping host paths to guest mount
  points
- Wizard shows "Mount home directory in VM? (read-only) [y/N]" after text
  fields
- Headless `mounts` config field now functional (was previously accepted but
  ignored)
- Stale docs fixed
- 10 new tests added (3 guestMountPoint, 4 extra mounts YAML, 3 configToVMConfig)
