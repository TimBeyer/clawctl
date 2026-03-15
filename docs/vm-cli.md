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
- **Idempotent tool wrappers** — each system tool (apt, systemd, node,
  etc.) has a typed module that checks current state before acting.
- **A health-check surface** — `claw doctor` runs inside the VM with
  full access to the guest filesystem, systemd, and PATH. The host
  calls it to verify provisioning and diagnose issues.
- **Clean error boundaries** — errors are caught and returned as data,
  not swallowed by `set -e` or lost in stderr.

## How the host uses `claw`

During provisioning, `host-core/src/provision.ts` deploys the compiled
binary into the VM at `/usr/local/bin/claw`, then invokes it:

```
driver.exec(vmName, "sudo claw provision system --json")
driver.exec(vmName, "claw provision tools --json")
driver.exec(vmName, "claw provision openclaw --json")
```

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
    commands/
      provision/
        index.ts               Registers provision subcommands
        stages.ts              ProvisionStage type + runStage() runner
        system.ts              Stage definition: apt + node + systemd + tailscale
        tools.ts               Stage definition: homebrew + op-cli + shell profile
        openclaw.ts            Stage definition: openclaw + env vars + gateway stub
      doctor.ts                Health checks (mounts, env, PATH, services, openclaw)
      checkpoint.ts            Signal host to commit data changes
    tools/                     One module per system tool
      types.ts                 ProvisionResult interface
      fs.ts                    ensureLineInFile, ensureDir
      curl.ts                  downloadFile, downloadAndRun
      shell-profile.ts         ensureInBashrc, ensureInProfile, ensurePath
      apt.ts                   isInstalled, update, install, ensure
      systemd.ts               findDefaultUser, enableLinger, isEnabled, isActive, ...
      node.ts                  isInstalled, version, provision
      tailscale.ts             isInstalled, provision
      homebrew.ts              isInstalled, install, provision
      op-cli.ts                isInstalled, provision
      openclaw.ts              isInstalled, version, doctor, provision, provisionGatewayStub
```

## Tool abstraction layer (`tools/`)

Each module in `tools/` wraps all interactions with one system tool.
Provisioning commands never call `exec()` directly — they compose tool
functions.

### Two kinds of functions

**Operational functions** are building blocks. They do one thing and
throw on failure:

```typescript
// tools/apt.ts
export async function install(packages: string[]): Promise<void> {
  const result = await exec("apt-get", ["install", "-y", "-qq", ...packages]);
  if (result.exitCode !== 0) {
    throw new Error(`apt-get install failed: ${result.stderr}`);
  }
}
```

**Provision functions** are what orchestrators call. They check current
state, act if needed, catch errors, and return a `ProvisionResult`:

```typescript
// tools/apt.ts
export async function ensure(packages: string[]): Promise<ProvisionResult> {
  try {
    const toInstall = [];
    for (const pkg of packages) {
      if (!(await isInstalled(pkg))) toInstall.push(pkg);
    }
    if (toInstall.length === 0) {
      return { name: "apt-packages", status: "unchanged" };
    }
    await update();
    await install(toInstall);
    return { name: "apt-packages", status: "installed" };
  } catch (err) {
    return { name: "apt-packages", status: "failed", error: String(err) };
  }
}
```

### ProvisionResult

```typescript
interface ProvisionResult {
  name: string;
  status: "installed" | "unchanged" | "failed";
  detail?: string;
  error?: string;
}
```

Three states: `"installed"` (something changed), `"unchanged"` (already
in the desired state), `"failed"` (error caught and returned).

### Cross-tool composition

Tools can use each other. For example, `openclaw.provisionGatewayStub()`
internally calls `systemd.isEnabled()`, `systemd.daemonReload()`,
`systemd.enable()`, and `fs.ensureDir()`. The orchestrator doesn't need
to know these details:

```typescript
// commands/provision/openclaw.ts — the orchestrator
steps.push(await openclaw.provision());
steps.push(await openclaw.provisionEnvVars());
steps.push(await openclaw.provisionNpmGlobalPath());
steps.push(await openclaw.provisionGatewayStub());
```

### Provisioning stages

Each orchestrator is defined as a `ProvisionStage` constant — a named
list of steps with `run` functions. A shared `runStage()` handles all
the boilerplate (numbered logging, collecting results, checking
failures, ok/fail output):

```typescript
// commands/provision/system.ts
export const systemStage: ProvisionStage = {
  name: "system",
  phase: "provision-system",
  steps: [
    { name: "apt-packages", label: "APT packages", run: () => apt.ensure(APT_PACKAGES) },
    { name: "nodejs", label: "Node.js", run: () => node.provision() },
    { name: "systemd-linger", label: "systemd linger", run: () => systemd.provisionLinger() },
    { name: "tailscale", label: "Tailscale", run: () => tailscale.provision() },
  ],
};
```

The runner produces numbered, structured output:

```
=== system provisioning ===
[1/4] APT packages
      ✓ installed — build-essential, git, curl
[2/4] Node.js
      ✓ unchanged — v22.22.1
[3/4] systemd linger
      ✓ installed — lima
[4/4] Tailscale
      ✓ unchanged
=== system provisioning complete (4 steps) ===
```

### Adding a new tool

1. Create `tools/<tool>.ts` with operational functions + a `provision()`
   function that returns `ProvisionResult`.
2. Import it in the appropriate orchestrator
   (`commands/provision/system.ts`, `tools.ts`, or `openclaw.ts`).
3. If `doctor.ts` should check for it, use the tool's `isInstalled()`
   or other query functions there.

Constants (URLs, versions) go in the tool module — not centralized —
unless they're shared across multiple tools.

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

| Check           | What it verifies                   | availableAfter     |
| --------------- | ---------------------------------- | ------------------ |
| mount-project   | /mnt/project is readable           | vm-created         |
| mount-data      | /mnt/project/data is writable      | vm-created         |
| path-claw       | claw on PATH                       | vm-created         |
| path-node       | node on PATH                       | provision-system   |
| path-op         | op on PATH                         | provision-tools    |
| path-brew       | brew on PATH                       | provision-tools    |
| env-\*          | OPENCLAW_STATE_DIR/CONFIG_PATH set | provision-openclaw |
| path-openclaw   | openclaw on PATH                   | provision-openclaw |
| service-gateway | openclaw-gateway.service is active | bootstrap          |
| openclaw-doctor | `openclaw doctor` passes           | bootstrap          |

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
