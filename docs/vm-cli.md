# Internal CLI (`claw`) — Guest-side Provisioning and Health Checks

## Why an internal CLI?

Provisioning a VM typically means generating shell scripts on the host,
piping them into the guest, and parsing their text output. This works,
but it's fragile: shell scripts are hard to test in isolation, error
handling is coarse (`set -e` or nothing), and the host has to scrape
unstructured output to understand what happened.

`claw` is a compiled TypeScript binary that lives inside the VM. The
host CLI invokes it via `driver.exec()` and gets structured JSON back.
This gives us:

- **Typed, testable provisioning logic** — the same language and type
  system on both sides of the VM boundary.
- **Structured output** — every command returns a JSON envelope
  (`{ status, data, errors }`) so the host can programmatically react
  to results instead of parsing log lines.
- **Capability-driven provisioning** — provisioning is handled by
  `CapabilityDef` modules that hook into lifecycle phases. See
  `docs/capabilities.md` for the extension system.
- **A health-check surface** — `claw doctor` runs inside the VM with
  full access to the guest filesystem, systemd, and PATH. The host
  calls it to verify provisioning and diagnose issues.
- **Clean error boundaries** — errors are caught and returned as data,
  not swallowed by `set -e` or lost in stderr.

## Design principle: delegate to `claw`

`claw` is both the agent's management CLI and the VM's installer. All
VM-side setup — system packages, tools, OpenClaw, workspace skills —
should be provisioned through `claw` rather than generated as shell
commands on the host. The host's job is to deploy the `claw` binary and
invoke its provisioning stages; `claw` does the actual work inside the VM.

This keeps the host thin (one binary to deploy, structured JSON back) and
makes provisioning idempotent and re-runnable from inside the VM for
debugging or recovery.

## How the host uses `claw`

During provisioning, `host-core/src/provision.ts` deploys the compiled
binary into the VM at `/usr/local/bin/claw`, then invokes it:

```
driver.exec(vmName, "sudo claw provision system --json")
driver.exec(vmName, "claw provision tools --json")
driver.exec(vmName, "claw provision openclaw --json")
driver.exec(vmName, "claw provision workspace --json")
```

After `openclaw onboard`, the host runs the bootstrap phase:

```
driver.exec(vmName, "claw provision bootstrap --json")
```

This executes post-onboard hooks (AGENTS.md managed sections, etc.).
See `docs/capabilities.md` for the hook system.

After provisioning, the host runs `claw doctor --json` to verify that
all tools are installed and services are healthy. The structured output
lets the host distinguish hard errors from expected warnings (e.g. the
gateway service is not active until after bootstrap).

The `watch` command on the host uses `claw checkpoint` to signal that
data has changed and should be committed.

## Package structure

```
packages/vm-cli/
  bin/claw.ts                  Entry point (commander dispatch)
  src/
    exec.ts                    execa wrapper (exec, commandExists)
    output.ts                  JSON envelope helpers (log, ok, fail)
    capabilities/
      registry.ts              Static capability registry + dependency resolution
      context.ts               CapabilityContext implementation (wires to vm-cli tools)
    commands/
      provision/
        index.ts               Registers provision subcommands (system, tools, openclaw, workspace, bootstrap)
      doctor.ts                Health checks (mounts, env, PATH, services, openclaw)
      checkpoint.ts            Signal host to commit data changes
    tools/                     System primitives backing CapabilityContext
      fs.ts                    ensureLineInFile, ensureDir
      curl.ts                  downloadFile, downloadAndRun
      shell-profile.ts         ensureInBashrc, ensureInProfile, ensurePath
      systemd.ts               findDefaultUser, enableLinger, isEnabled, isActive, ...
      openclaw.ts              isInstalled, version, doctor
      provision-config.ts      Provision config reader
```

Provisioning logic (what gets installed, in what order) lives in the
capability modules in `@clawctl/capabilities`, not in this package.
The provision subcommands are thin — they resolve hooks from the
registry and delegate to the capability runner. See `docs/capabilities.md`
for the full extension system.

## System primitives (`tools/`)

The remaining modules in `tools/` are low-level system primitives that
back the `CapabilityContext` implementation. Capabilities access them
indirectly via the context SDK — not by direct import.

| Module                | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `fs.ts`               | `ensureLineInFile`, `ensureDir`                           |
| `curl.ts`             | `downloadFile`, `downloadAndRun`                          |
| `shell-profile.ts`    | `ensureInBashrc`, `ensureInProfile`, `ensurePath`         |
| `systemd.ts`          | systemctl + loginctl operations                           |
| `openclaw.ts`         | OpenClaw CLI queries (`isInstalled`, `version`, `doctor`) |
| `provision-config.ts` | Provision config reader                                   |

For the provisioning extension system (how to add new tools, define
hooks, declare doctor checks), see `docs/capabilities.md`.

## JSON output protocol

Every `claw` command outputs a JSON envelope to stdout:

```json
{ "status": "ok", "data": { "steps": [...] }, "errors": [] }
{ "status": "error", "data": { "steps": [...] }, "errors": ["apt-packages: ..."] }
```

Progress messages go to stderr (or stdout in non-JSON mode) so they
don't interfere with the structured output. The host parses stdout
for the result and forwards stderr to the user for progress visibility.

The `--json` flag enables JSON mode. Without it, commands print
human-readable output (used when running `claw` manually inside the VM
for debugging).

## Doctor checks

`claw doctor` verifies the VM's health from the inside. Each check
declares `availableAfter` — the lifecycle phase after which it's
expected to pass:

| Check            | What it verifies                   | availableAfter      |
| ---------------- | ---------------------------------- | ------------------- |
| mount-project    | /mnt/project is readable           | vm-created          |
| mount-data       | /mnt/project/data is writable      | vm-created          |
| path-claw        | claw on PATH                       | vm-created          |
| path-node        | node on PATH                       | provision-system    |
| path-op          | op on PATH                         | provision-tools     |
| path-brew        | brew on PATH                       | provision-tools     |
| env-\*           | OPENCLAW_STATE_DIR/CONFIG_PATH set | provision-openclaw  |
| path-openclaw    | openclaw on PATH                   | provision-openclaw  |
| skill-checkpoint | checkpoint skill installed         | provision-workspace |
| service-gateway  | openclaw-gateway.service is active | bootstrap           |
| openclaw-doctor  | `openclaw doctor` passes           | bootstrap           |

### `--after` flag

Doctor accepts `--after <phase>` to declare how far the lifecycle has
progressed. A failing check is a warning if its `availableAfter` phase
hasn't been reached yet; otherwise it's an error. Without `--after`,
all failures are errors (strictest mode).

The host passes `--after provision-openclaw` when verifying after
provisioning, so gateway and openclaw-doctor failures are warnings
while mount/path/env failures are hard errors.

## Build and deployment

```bash
bun run build:claw    # → dist/claw (linux-arm64 binary)
```

During provisioning, the host copies `dist/claw` into the VM:

```
driver.copy(vmName, "dist/claw", "/tmp/claw")
driver.exec(vmName, "sudo mv /tmp/claw /usr/local/bin/claw && sudo chmod +x /usr/local/bin/claw")
```

In development, `bin/clawctl-dev` auto-builds the claw binary before
running the host CLI, so changes to `vm-cli` are picked up without a
manual build step.
