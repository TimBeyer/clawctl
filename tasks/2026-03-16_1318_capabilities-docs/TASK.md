# Capabilities system documentation

## Status: Resolved

## Scope

Write `docs/capabilities.md` covering the capability extension system:
types, lifecycle hooks, the runner, registry, context SDK, and how to
add new capabilities.

Does not cover changes to the capability system itself — documentation only.

## Plan

1. Write `docs/capabilities.md`
2. Update `docs/vm-cli.md` to reference the capabilities system
3. Update `docs/vm-provisioning.md` to include `provision bootstrap`

## Steps

- [x] Write `docs/capabilities.md`
- [x] Update cross-references in existing docs

## Outcome

Created `docs/capabilities.md` covering the full capability extension
system: types, lifecycle phases (including the new `bootstrap` phase),
hook timing, package layout, how to write a capability, the runner,
state tracking, migrations, and AGENTS.md managed sections.

Updated `docs/vm-cli.md` to reflect the capabilities-based architecture
(package structure, bootstrap phase reference). Updated
`docs/vm-provisioning.md` to include `provision bootstrap` in the
sequence and re-run instructions.
