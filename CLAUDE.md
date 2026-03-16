# clawctl

Full-lifecycle bootstrapping and management tool for OpenClaw gateways
running in Lima VMs on macOS. Built with Bun + TypeScript + Ink.

Each clawctl **instance** is a Lima VM running an OpenClaw **gateway**.
The gateway hosts one or more **agents**. clawctl manages the instance
lifecycle (VM, networking, credentials); OpenClaw manages the agents inside.

- **Bootstrap**: Create a VM, provision it, install the OpenClaw gateway, run
  onboarding — all from the host. The user never shells into the VM to set
  things up.
- **Manage**: Start, stop, inspect, and reconfigure instances. The project
  directory on the host is the source of truth.
- **Persist**: Gateway config and state are mounted into the host project
  directory (`data/`) where they're editable and backed up by git. Rebuilding
  the VM doesn't lose configuration.
- **Delegate, don't duplicate**: We use OpenClaw's own installer and onboarding
  wizard. We wrap their tooling rather than reimplementing it, so we stay
  compatible as they evolve.

## Tech Stack

- **Runtime**: Bun (native TypeScript, no build step for dev)
- **CLI UI**: Ink 6.x (React for terminals) + React 18
- **Subprocess**: execa for shelling out to limactl, brew, etc.
- **VM**: Lima with vz backend + virtiofs mounts on Apple Silicon
- **Target OS in VM**: Ubuntu 24.04 arm64

## Workspace Structure

Bun workspaces monorepo with seven packages:

```
packages/
  types/          @clawctl/types         — Shared types, schemas, constants, pure functions
  templates/      @clawctl/templates     — Pure script/config generators (string in → string out)
  capabilities/   @clawctl/capabilities  — Capability definitions, runner, state tracking
  host-core/      @clawctl/host-core     — Host-side VM management library (drivers, exec, provision)
  daemon/         @clawctl/daemon        — Background daemon (IPC, scheduler, tasks)
  cli/            @clawctl/cli           — Host CLI (commands + Ink wizard UI)
  vm-cli/         @clawctl/vm-cli        — Guest CLI (claw) — runs inside the VM
```

### Key Directories

- `packages/cli/bin/cli.tsx` — host CLI entry point
- `packages/cli/src/commands/` — CLI command handlers
- `packages/cli/src/steps/` — wizard step components (each self-contained, calls onComplete)
- `packages/cli/src/components/` — reusable UI components (spinner, progress, log output)
- `packages/host-core/src/` — non-UI logic (drivers, exec, provision, registry)
- `packages/daemon/src/` — background daemon (IPC server/client, scheduler, tasks)
- `packages/daemon/src/tasks/` — daemon task implementations (checkpoint-watch, health-monitor)
- `packages/capabilities/src/` — capability definitions (CapabilityDef modules) and runner
- `packages/vm-cli/bin/claw.ts` — guest CLI entry point (compiled to binary, deployed into VM)
- `packages/vm-cli/src/capabilities/` — capability registry and CapabilityContext implementation
- `packages/vm-cli/src/commands/` — guest CLI commands (provision, doctor, checkpoint)
- `packages/templates/src/` — template generators, one file per generated artifact
- `packages/types/src/` — shared types, schemas, constants
- `docs/` — detailed documentation for each subsystem

## Conventions

- All provisioning is idempotent
- Use execa (not child_process) for subprocess execution on the host
- Each wizard step is a React component that receives `onComplete` callback
- Templates use TypeScript template literals with `dedent`, not string files
- lima.yaml is generated dynamically based on user configuration choices
- Constants (URLs, versions, package lists) are colocated in the module that uses them — not centralized — unless genuinely shared across multiple packages
- Only cross-cutting values (mount points, ports, image URLs) go in `packages/types/src/constants.ts`
- Dynamic URLs use arrow functions: `const FOO_URL = (version: string) => \`...\``

### Internal CLI (`claw`) conventions

- `claw` is both the agent's management CLI and the VM's installer. All VM-side
  setup — system packages, tools, OpenClaw, workspace skills — is provisioned
  through **capabilities**. The host deploys the binary and invokes provisioning
  phases; `claw` delegates to the capability runner. See `docs/capabilities.md`
  for the extension system and `docs/vm-cli.md` for the guest CLI architecture.
- Capabilities are declared in `packages/capabilities/src/capabilities/` as
  `CapabilityDef` modules. Each capability hooks into lifecycle phases and
  receives a `CapabilityContext` SDK for system access.
- Remaining tool modules in `packages/vm-cli/src/tools/` (`curl.ts`, `fs.ts`,
  `systemd.ts`, `shell-profile.ts`, `openclaw.ts`) back the `CapabilityContext`
  implementation — capabilities use them indirectly via the context, not by
  direct import.
- Doctor checks are declared on capabilities via `doctorChecks` and use
  lifecycle phases (`availableAfter`) rather than hardcoded `warn` flags.
- The `claw` binary is compiled with `bun run build:claw` and deployed into the VM
  at `/usr/local/bin/claw` during provisioning.

## Dev Setup

`bin/clawctl-dev` is a symlink to `packages/cli/bin/clawctl-dev`, which
resolves its own location and execs `bun cli.tsx`. Symlink it onto PATH
to run the CLI from anywhere without building a binary first.

```bash
ln -s "$(pwd)/bin/clawctl-dev" ~/.local/bin/clawctl-dev
```

Then from any directory:

```bash
clawctl-dev create --config ./vm-bootstrap.json
```

## Commands

- `bun packages/cli/bin/cli.tsx` — run the CLI (interactive wizard)
- `bun packages/cli/bin/cli.tsx create --config <path>` — headless mode (config-file-driven, no prompts)
- `bun build ./packages/cli/bin/cli.tsx --compile --outfile dist/clawctl` — build host CLI binary
- `bun run build:claw` — build guest CLI binary (`dist/claw`, linux-arm64)
- `bun test` — run unit tests (templates, parsing, hooks, exec)
- `bun run test:vm` — run VM provisioning tests (requires Lima, slow)
- `bun run lint` — run ESLint
- `bun run format:check` — check Prettier formatting
- `bun run format` — auto-fix formatting

## Workflow

### Branching

- Always work on a branch — never commit directly to main
- If you're on main and starting work, create a feature branch first
- Branch names should be descriptive (e.g., `fix/npm-user-permissions`, `feat/add-live-vm-logstream`)
- One branch per task / piece of work

### Tasks

- Create a directory in `tasks/` for each piece of work
- Name: `YYYY-MM-DD_hhmm_descriptive-kebab-case` (e.g., `2026-02-24_1337_log-coloring`)
- **Get the timestamp from the OS** (`date +%Y-%m-%d_%H%M`) — do not guess or make up a time
- A task is a concrete, completable unit of work — not an epic or a backlog
- Include a TASK.md with: scope, plan, steps, current status
- Keep TASK.md updated as work progresses
- When coding work is done: mark TASK.md status as **Resolved** — the task directory stays in `tasks/`
- `tasks/archive/` is for periodic manual cleanup, not part of the PR workflow
- Commit task+plan first, before implementation code

### TASK.md Structure

Every TASK.md should have these sections:

```markdown
# <Title>

## Status: <Pending | In Progress | Resolved>

## Scope

What this task covers and — just as importantly — what it does not.

## Plan

Numbered high-level steps.

## Steps

Checkbox list (- [x] / - [ ]) of concrete work items.

## Notes

Running log of observations, questions, and decisions made during the work.
Write these as you go — not after the fact. Include:

- Design decisions and _why_ (not just what)
- Alternatives you considered and why they were rejected
- Anything a future reader would look at in the code and wonder "why?"
- Links to relevant docs, issues, or conversations

Don't log routine fixes (type errors, lint fixes, minor API quirks) —
only things where the reasoning isn't obvious from the code itself.

## Outcome

Written when marking the task as Resolved. A short summary of:

- What was actually delivered (may differ from the original plan)
- What was deferred or descoped
- Known limitations or follow-up work needed
```

**Why this matters**: Task documents are the project's decision log. When
someone later asks "why did we do X?", the answer should be findable by
scanning task Notes and Outcomes — not locked in someone's head or lost
in a chat transcript.

## Committing

Commit frequently.
Use conventional commits.
Always commit the task and plan first.
Always work on a branch — see [Branching](#branching).
