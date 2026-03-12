# Review OpenClaw Terminology

## Status: Resolved

## Scope

Align clawctl's user-facing terminology with OpenClaw's own vocabulary.
The main fix: we say "agent" when we mean "gateway" (the central OpenClaw
process), and we should be precise about the distinction.

**In scope**: README, CLAUDE.md, docs/\*.md, CLI help strings.
**Out of scope**: Code identifiers (`InstanceConfig`, `RegistryEntry`, etc.) —
"instance" is our own valid term for a clawctl-managed VM + gateway.

## Plan

1. Replace "agent" → "gateway" in user-facing prose where it refers to the
   whole running OpenClaw system (not the agent persona inside it)
2. Keep "instance" as clawctl's term for the managed unit (VM + gateway + project dir)
3. Add a brief definition of "instance" so the relationship is clear
4. Keep "agent" where it correctly refers to OpenClaw agents (personas hosted by the gateway)
5. Update CLI help strings in bin/cli.tsx and finish step

## Steps

- [x] Update README.md
- [x] Update CLAUDE.md
- [x] Update bin/cli.tsx description and help text
- [x] Update src/steps/finish.tsx
- [x] Update docs/getting-started.md
- [x] Update docs/architecture.md
- [x] Update docs/project-directory.md (no changes needed)
- [x] Update docs/headless-mode.md
- [x] Update docs/snapshots-and-rebuilds.md
- [x] Update docs/config-reference.md
- [x] Run lint, format, tests
- [x] Grep for remaining incorrect uses

## Notes

- OpenClaw docs consistently use "Gateway" for the running system and "Agent"
  for the hosted persona. They avoid "instance", "server", "application".
- clawctl's concept of an "instance" (VM + gateway + project dir) has no
  OpenClaw equivalent — it's genuinely our concept, so keeping the term is fine.
- The model: `instance = Lima VM + OpenClaw gateway + project directory`,
  where the gateway hosts one or more agents.

## Outcome

Aligned user-facing terminology with OpenClaw's vocabulary:

- Replaced "agent" → "gateway" in all prose where it referred to the running
  OpenClaw system (README, CLAUDE.md, docs, finish step UI string)
- Kept "instance" as clawctl's own term for the managed unit (VM + gateway +
  project dir), since OpenClaw has no equivalent concept
- Added a terminology callout in README and CLAUDE.md defining the relationship:
  instance = VM + gateway + project dir; gateway hosts agents
- Kept "agent" where it correctly refers to OpenClaw agent personas
- Kept code identifiers (`InstanceConfig`, `RegistryEntry`) unchanged — "instance"
  is our valid term
- Updated one TSDoc comment in `src/types.ts` ("agent state" → "gateway state")
- CLI command descriptions kept as-is — they use "instance" which is correct

Files not changed (no incorrect terminology found): `docs/project-directory.md`,
`docs/tailscale-setup.md`, `docs/1password-setup.md`, `docs/troubleshooting.md`,
`bin/cli.tsx` (command descriptions use "instance" correctly)
