# Review OpenClaw Terminology

## Status: In Progress

## Scope

Align clawctl's user-facing terminology with OpenClaw's own vocabulary.
The main fix: we say "agent" when we mean "gateway" (the central OpenClaw
process), and we should be precise about the distinction.

**In scope**: README, CLAUDE.md, docs/*.md, CLI help strings.
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

- [ ] Update README.md
- [ ] Update CLAUDE.md
- [ ] Update bin/cli.tsx description and help text
- [ ] Update src/steps/finish.tsx
- [ ] Update docs/getting-started.md
- [ ] Update docs/architecture.md
- [ ] Update docs/project-directory.md
- [ ] Update docs/headless-mode.md
- [ ] Update docs/snapshots-and-rebuilds.md
- [ ] Update docs/config-reference.md
- [ ] Run lint, format, tests
- [ ] Grep for remaining incorrect uses

## Notes

- OpenClaw docs consistently use "Gateway" for the running system and "Agent"
  for the hosted persona. They avoid "instance", "server", "application".
- clawctl's concept of an "instance" (VM + gateway + project dir) has no
  OpenClaw equivalent — it's genuinely our concept, so keeping the term is fine.
- The model: `instance = Lima VM + OpenClaw gateway + project directory`,
  where the gateway hosts one or more agents.

## Outcome

(To be written on completion)
