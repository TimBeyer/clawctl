---
name: developing-vm-cli
description: "Develop the guest CLI (claw) that runs inside the VM. Use when working on vm-cli commands, the JSON output protocol, doctor checks, CapabilityContext implementation, or the capability registry."
---

# Developing the Guest CLI (claw)

`claw` is a compiled TypeScript binary deployed into the VM at
`/usr/local/bin/claw`. The host CLI invokes it via `driver.exec()` and
gets structured JSON back.

## Package structure

- `bin/claw.ts` — entry point (commander dispatch)
- `src/exec.ts` — execa wrapper
- `src/output.ts` — JSON envelope helpers (`log`, `ok`, `fail`)
- `src/capabilities/registry.ts` — static capability registry +
  dependency resolution
- `src/capabilities/context.ts` — `CapabilityContext` implementation
  (wires to vm-cli tool modules)
- `src/commands/provision/` — provision subcommands (delegates to
  capability runner)
- `src/commands/doctor.ts` — health checks with lifecycle-based warnings
- `src/tools/` — system primitives backing `CapabilityContext`

## JSON output protocol

Every command outputs a JSON envelope to stdout:
`{ status, data, errors }`. Progress messages go to stderr. The `--json`
flag enables JSON mode; without it, commands print human-readable output.

## Doctor checks

Each check declares `availableAfter` — the lifecycle phase after which
it should pass. The `--after` flag tells doctor which phase has been
reached. Checks whose phase hasn't been reached are warnings; all others
are errors.

## Build

```bash
bun run build:claw    # -> dist/claw (linux-arm64 binary)
```

## Full reference

See [references/vm-cli.md](references/vm-cli.md) for the complete
documentation including the doctor checks table, build/deployment
details, and system primitives.
