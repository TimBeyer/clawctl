# Architecture

## Overview

`clawctl` is a CLI for creating and managing OpenClaw gateways on macOS. Each **instance** (a Lima VM running an OpenClaw gateway) is provisioned, configured, and lifecycle-managed entirely from the host. The user never shells into the VM to set things up.

The tool delegates to OpenClaw's own tooling (installer, onboarding wizard) rather than reimplementing it. Gateway config and state persist in the host project directory (`data/`) via virtiofs mounts, so they're editable from the host and survive VM rebuilds.

The high-level flow (two modes):

**Interactive wizard** (`clawctl create` or `bun bin/cli.tsx create`):

```
User runs CLI
  -> Ink wizard collects config
  -> Host: install Lima via Homebrew if missing
  -> Generate project directory (data/)
  -> limactl create (downloads Ubuntu image, boots VM)
  -> Deploy claw binary into VM
  -> Host invokes claw provision {system,tools,openclaw} --json inside VM
  -> Host invokes claw doctor --json --after provision-openclaw to verify
  -> Optional credential setup (1Password token, Tailscale auth)
  -> OpenClaw onboarding (interactive, runs inside VM via limactl shell)
  -> Register instance + write clawctl.json
  -> Done -- dashboard accessible at http://localhost:18789
```

**Headless mode** (`clawctl create --config <path>`):

```
Load JSON config -> check prereqs -> install Lima if missing
  -> create VM -> deploy claw binary -> claw provision (system/tools/openclaw)
  -> claw doctor --after provision-openclaw (verify) -> setup 1Password? -> connect Tailscale?
  -> bootstrap openclaw? (if provider configured)
  -> Register instance + write clawctl.json
  -> Done
```

Config-file-driven, no prompts. Progress output via `[prefix] message` lines.

When `provider` is present in the config, the bootstrap phase runs
`openclaw onboard --non-interactive` to set up auth, install the daemon, and
configure the gateway. It then applies post-onboard config (tools profile,
workspace, sandbox) and optional Telegram channel setup. The result is a
fully working gateway — daemon running, dashboard accessible.

Without a `provider` section, onboarding is skipped and the user runs
`openclaw onboard` manually in the VM.

See `examples/config.json`, `examples/config.bootstrap.json`, and
`examples/config.full.json` for the schema.

## Tech Stack

| Layer      | Tool               | Why                                                                            |
| ---------- | ------------------ | ------------------------------------------------------------------------------ |
| Runtime    | Bun                | Native TypeScript execution, no build step during development                  |
| CLI UI     | Ink 6 + React 18   | Declarative terminal UI with component model, text input, spinners             |
| Subprocess | execa 9            | Promise-based process execution with streaming support, replaces child_process |
| VM engine  | Lima (vz backend)  | Lightweight Linux VMs on macOS with virtiofs shared filesystems                |
| Guest OS   | Ubuntu 24.04 arm64 | LTS release, broad package availability, cloud-init compatible                 |

## Directory Structure

The project is a Bun workspaces monorepo. The two most important packages
are `cli/` (host-side) and `vm-cli/` (guest-side):

```
packages/
  types/                   Shared types, schemas, constants
  templates/               Lima config generators (lima-yaml.ts)
  capabilities/            Capability definitions + runner
    src/
      capabilities/        Individual capability modules
        system-base/       APT packages, Node.js, systemd linger
        homebrew/          Homebrew + shell profile
        openclaw/          OpenClaw CLI + gateway stub
        one-password/      1Password CLI + skills + AGENTS.md section
        checkpoint.ts      Checkpoint skill + AGENTS.md section
        tailscale.ts       Tailscale installer
      runner.ts            Phase runner (executes resolved hooks)
      state.ts             State tracking (capability-state.json)
      util.ts              Hook key parsing
      index.ts             Public exports
  host-core/               Host-side library
    src/
      drivers/             VM backend abstraction
        types.ts           VMDriver interface
        lima.ts            LimaDriver implementation (limactl)
      provision.ts         VM provisioning sequence (deploy claw, invoke claw provision)
      verify.ts            Post-provisioning verification (invokes claw doctor)
      headless.ts          Headless orchestrator (config-file-driven)
      cleanup.ts           VM + project dir cleanup, signal handlers
      config.ts            Config loading, validation, sanitization
      credentials.ts       1Password + Tailscale setup
      bootstrap.ts         Post-provisioning openclaw setup
      registry.ts          Instance registry (~/.config/clawctl/instances.json)
      ...
  daemon/                  Background daemon library
    src/
      server.ts            Unix socket server (NDJSON IPC)
      client.ts            IPC client (CLI → daemon)
      lifecycle.ts         PID file, spawn/stop, ensureDaemon
      scheduler.ts         Tick-based task dispatcher
      logging.ts           Structured NDJSON logger + rotation
      run.ts               Main daemon loop
      tasks/               Task implementations
        checkpoint-watch   Checkpoint signal → git commit
        health-monitor     VM status polling + optional auto-restart
  cli/                     Host CLI (Ink wizard + commands)
    bin/cli.tsx            Entry point
    src/
      app.tsx              Root component, wizard state machine
      commands/            One module per subcommand (create, list, status, daemon, ...)
      steps/               One component per wizard step (8 total)
      components/          Reusable Ink components (spinner, step-indicator, ...)
  vm-cli/                  Guest CLI (claw) — runs inside the VM
    bin/claw.ts            Entry point
    src/
      exec.ts              execa wrapper for guest-side commands
      output.ts            JSON envelope helpers (log, ok, fail)
      capabilities/
        registry.ts        Static capability registry + dependency resolution
        context.ts         CapabilityContext implementation (wires to vm-cli tools)
      commands/
        provision/         Provision subcommands (delegates to capability runner)
        doctor.ts          Health checks with lifecycle-based warnings
        checkpoint.ts      Signal host to commit data changes
      tools/               System primitives backing CapabilityContext
        fs.ts              File system helpers (ensureLineInFile, ensureDir)
        curl.ts            Download helpers
        shell-profile.ts   Login profile management
        systemd.ts         systemctl + loginctl operations
        openclaw.ts        OpenClaw CLI queries (isInstalled, version, doctor)
        provision-config.ts  Provision config reader
```

## Key Design Decisions

### Internal CLI (`claw`) for guest-side operations

Instead of generating shell scripts on the host and piping them into the
VM, provisioning and health checks are handled by `claw` — a compiled
TypeScript binary deployed into the VM at `/usr/local/bin/claw`. The
host CLI invokes it via `driver.exec()`:

```
driver.exec(vmName, "sudo claw provision system --json")
driver.exec(vmName, "claw doctor --json --after provision-openclaw")
```

This gives us the same language and type system on both sides of the VM
boundary. Provisioning logic is testable TypeScript, errors are returned
as structured JSON instead of parsed from log output, and every operation
is idempotent by construction (capabilities check current state before
acting). Doctor checks declare which lifecycle phase they require
(`availableAfter`), so the host can distinguish expected warnings from
real failures based on how far provisioning has progressed.

The `claw` binary is compiled with `bun run build:claw` (linux-arm64)
and deployed during the provisioning sequence. In development,
`bin/clawctl-dev` auto-builds it before running the host CLI.

See `docs/vm-cli.md` for the guest CLI architecture and
`docs/capabilities.md` for the capability extension system.

### vz virtualization backend

Lima supports both QEMU and Apple's Virtualization.framework (`vz`). We use `vz` because:

- Near-native performance on Apple Silicon (hardware-accelerated)
- virtiofs mount support (QEMU uses 9p which is slower and has permission quirks)
- Lower memory overhead than QEMU

The generated `lima.yaml` sets `vmType: vz` explicitly.

### virtiofs mounts

Two mounts are configured:

| Host path         | Guest mount         | Writable | Purpose                                                |
| ----------------- | ------------------- | -------- | ------------------------------------------------------ |
| `projectDir`      | `/mnt/project`      | No       | VM config (read-only to prevent guest from corrupting) |
| `projectDir/data` | `/mnt/project/data` | Yes      | Persistent writable storage that survives VM rebuilds  |

### Ubuntu 24.04 arm64

We use the official Ubuntu cloud image for aarch64. Cloud-init handles initial user setup. Lima's provision scripts run after first boot.

### execa for subprocesses

All subprocess calls go through `src/lib/exec.ts`, which wraps execa with `reject: false` so callers get structured results (`stdout`, `stderr`, `exitCode`) instead of thrown errors. This makes error handling explicit at each call site.

### Templates for VM configuration

`lima-yaml.ts` generates the Lima VM configuration by interpolating
`VMConfig` values (CPUs, memory, disk, paths, mounts) at generation
time. It uses `dedent` for readable multi-line template literals.

Provisioning itself is handled by the `claw` binary inside the VM (see
above), not by generated shell scripts.

## Component Relationships

The `App` component in `src/app.tsx` is a state machine driven by a `WizardStep` discriminated union:

```
"welcome" -> "host-setup" (if Lima missing) -> "configure" -> "create-vm" -> "provision" -> "credentials" -> "onboard" -> "finish"
              or "configure" (if Lima already installed)
```

Each step component receives an `onComplete` callback. When a step finishes its work, it calls `onComplete` with any results (e.g., `PrereqStatus`, `VMConfig`), and `App` advances the state.

State flows downward:

- `App` holds `VMConfig`, `PrereqStatus`, and `CredentialConfig`
- Steps that need config receive it as props
- Steps that produce config pass it back via `onComplete`

## Onboarding Approach

OpenClaw onboarding (`openclaw onboard`) is an interactive wizard that runs inside the VM. We need to give the user full terminal interaction with it.

### Current implementation: exit Ink + stdio inherit

The onboard step exits the Ink app (via `useApp().exit()`) with an `OnboardResult` that triggers post-wizard logic in the create command. The subprocess `limactl shell <vmName> -- openclaw onboard --skip-daemon` runs with `stdio: 'inherit'`, giving the user full PTY interaction with OpenClaw's prompts. After the subprocess exits, the gateway daemon is installed separately, and the instance is registered.

**Ink gets its own stdin via `/dev/tty`**: Ink's `render()` receives a private `tty.ReadStream` opened on `/dev/tty` instead of `process.stdin`. This prevents Ink from putting `process.stdin` into raw mode or attaching `'readable'` listeners to it. When Ink exits, the private stream is destroyed — `process.stdin` (fd 0) remains untouched and pristine for the subprocess to inherit. Without this, Bun's stdin implementation continues consuming bytes from fd 0 after Ink's cleanup, causing the parent and child process to compete for input (manifesting as swallowed keypresses). See `src/commands/create.ts` for the implementation.

Trade-offs:

- Simple and reliable — no terminal emulation layer
- Works around Bun's stdin behavior (Bun ignores `pause()`/`readStop()` on stdin)
- Falls back to `process.stdin` when `/dev/tty` is unavailable (CI, piped input)
- Loses Ink UI during onboarding (no step indicator, no guidance sidebar)
- Cannot provide contextual tips alongside the wizard

### Target UX: embedded PTY surface (future)

The eventual goal is to keep Ink active during onboarding by embedding the subprocess output in a virtual terminal surface. This would allow a contextual guidance sidebar with tips based on what the onboarding wizard is currently showing. Requires `node-pty` for PTY management and `xterm-headless` for ANSI parsing into a renderable screen buffer.

## CLI Command Conventions

### Instance resolution

Every command that targets an instance uses `requireInstance(opts)` from
host-core. It resolves the instance in this order:

1. Explicit `-i <name>` / `--instance <name>` flag
2. Local `.clawctl` context file (set by `clawctl use`)
3. Global context (`~/.config/clawctl/context.json`)
4. Error if none found

### Positional `[name]` argument

Commands that **only** target an instance (no other positional args)
offer `[name]` as a convenience positional:

```
clawctl status [name]       # OK — no other positionals
clawctl start [name]        # OK
clawctl mount list [name]   # OK
```

Commands that have **other required positional arguments** must NOT use
`[name]` — Commander consumes the first positional as the optional name,
swallowing the real argument. Use `-i` or context resolution instead:

```
clawctl mount add <host-path> <guest-path>     # No [name] — would eat <host-path>
clawctl mount remove <guest-path>              # No [name] — would eat <guest-path>
```

## Error Handling

- Each step handles its own errors and displays them inline
- The wizard does not auto-advance on error -- the user sees the error and the process stops
- `exec()` never throws (uses `reject: false`); callers check `exitCode`
- Long operations (`limactl create`) have explicit timeouts (600 seconds)
