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
  -> limactl create (downloads Ubuntu image, boots VM, runs provision scripts)
  -> Verify provisioning (Node.js 22, Tailscale, Homebrew, 1Password CLI, OpenClaw)
  -> Optional credential setup (1Password token, Tailscale auth)
  -> OpenClaw onboarding (interactive, runs inside VM via limactl shell)
  -> Register instance + write clawctl.json
  -> Done -- dashboard accessible at http://localhost:18789
```

**Headless mode** (`clawctl create --config <path>`):

```
Load JSON config -> check prereqs -> install Lima if missing
  -> provision VM -> verify tools -> setup 1Password? -> connect Tailscale?
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

```
bin/cli.tsx              Entry point -- commander dispatch to subcommands
src/
  app.tsx                Root component, wizard state machine
  headless.ts            Headless orchestrator (config-file-driven provisioning)
  types.ts               Shared TypeScript interfaces (VMConfig, InstanceConfig, etc.)
  commands/              CLI command modules (one per subcommand)
    create.ts            Interactive wizard + headless create
    list.ts              List instances with live status
    status.ts            Detailed instance info
    start.ts             Start a stopped instance
    stop.ts              Stop a running instance
    restart.ts           Restart with health checks
    delete.ts            Delete VM + optional project purge
    shell.ts             Shell into VM
    register.ts          Register existing instance
    index.ts             Barrel export
  drivers/               VM backend abstraction
    types.ts             VMDriver interface
    lima.ts              LimaDriver implementation (limactl)
    index.ts             Exports
  steps/                 One component per wizard step (8 total)
    welcome.tsx          Prereq checks (macOS, Homebrew, Lima)
    configure.tsx        VM settings form (name, CPUs, memory, disk, directory)
    host-setup.tsx       Install Lima via Homebrew
    create-vm.tsx        Generate files + limactl create
    provision-status.tsx Verify installations inside VM
    credentials.tsx      1Password + Tailscale setup
    onboard.tsx          OpenClaw onboarding (exit Ink + stdio inherit)
    finish.tsx           Summary and next steps
  lib/                   Non-UI modules
    bootstrap.ts         Post-provisioning openclaw setup (onboard, config, telegram)
    config.ts            Config loading, validation, sanitization, VMConfig conversion
    registry.ts          Instance registry CRUD (~/.config/clawctl/instances.json)
    providers.ts         Provider registry + onboard command builder
    schemas/             Composable zod schemas, one per config section
      index.ts           Assembles instanceConfigSchema from parts
      base.ts            Resources, network, services, agent schemas
      provider.ts        Provider section schema (validates against registry)
      telegram.ts        Telegram section schema
    prereqs.ts           Host prerequisite checks (macOS, arm64, Homebrew, Lima)
    provision.ts         Full VM provisioning sequence (shared by wizard + headless)
    verify.ts            Post-provisioning tool verification
    credentials.ts       1Password + Tailscale setup (shared by wizard + headless)
    exec.ts              execa wrapper (exec, execStream, commandExists)
    homebrew.ts          brew operations (install formula, check version)
    git.ts               Initialize git repo with .gitignore
  templates/             Template generators (one file per generated artifact)
    constants.ts         Shared values (image URL, mount points, ports)
    index.ts             Re-exports all public generators
    lima-yaml.ts         generateLimaYaml(config, options)
    helpers.ts           generateHelpersScript()
    provision-system.ts  Orchestrator: calls system installers in order
    provision-user.ts    Orchestrator: calls user installers in order
    installers/          One installer template per tool
      apt-packages.ts    APT baseline packages
      nodejs.ts          Node.js via NodeSource
      tailscale.ts       Tailscale client
      homebrew.ts        Homebrew (Linuxbrew)
      op-cli.ts          1Password CLI arm64 binary
      systemd-linger.ts  loginctl enable-linger
      shell-profile.ts   PATH setup in .bashrc
      openclaw.ts        OpenClaw CLI via official installer
  components/            Reusable Ink components
    spinner.tsx          Animated braille spinner
    step-indicator.tsx   "Step N/8" progress bar
    log-output.tsx       Scrollable log tail
```

## Key Design Decisions

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

### Templates as TypeScript functions

Provisioning scripts are generated by template functions in `src/templates/`. Each installer is its own module that produces a standalone, runnable `.sh` script. Orchestrator templates (`provision-system.ts`, `provision-user.ts`) generate scripts that call the individual installers in order. `lima-yaml.ts` interpolates `VMConfig` values (CPUs, memory, disk, paths) into the Lima configuration at generation time. All templates use `dedent` for readable multi-line template literals.

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

## Error Handling

- Each step handles its own errors and displays them inline
- The wizard does not auto-advance on error -- the user sees the error and the process stops
- `exec()` never throws (uses `reject: false`); callers check `exitCode`
- Long operations (`limactl create`) have explicit timeouts (600 seconds)
