# Capabilities

Capabilities are the extension mechanism for VM provisioning. Each
capability is a self-contained module that declares what it installs,
when it runs, and what health checks it provides. The system handles
ordering, dependency resolution, state tracking, and migrations.

## Concepts

A **capability** is a named unit of VM functionality — for example,
`one-password` installs the 1Password CLI, writes wrapper scripts,
installs a skill, and adds an AGENTS.md section. All of this is declared
in a single `CapabilityDef` object.

Capabilities hook into **lifecycle phases**. Each phase corresponds to a
`claw provision <subcommand>` that the host invokes at the right time:

| Phase                 | Subcommand                 | Exec context | When                          |
| --------------------- | -------------------------- | ------------ | ----------------------------- |
| `provision-system`    | `claw provision system`    | root         | System packages, runtime      |
| `provision-tools`     | `claw provision tools`     | user         | User tools (brew, op)         |
| `provision-openclaw`  | `claw provision openclaw`  | user         | OpenClaw install + gateway    |
| `provision-workspace` | `claw provision workspace` | user         | Skills, workspace files       |
| `bootstrap`           | `claw provision bootstrap` | user         | Post-onboard (AGENTS.md etc.) |

The `bootstrap` phase runs after `openclaw onboard` completes. This is
where capabilities write AGENTS.md sections — the onboard step creates
the base workspace and AGENTS.md, then bootstrap hooks append managed
sections to it.

### Hook timing

Each phase supports three timing slots:

```
pre:<phase>  →  <phase>  →  post:<phase>
```

A capability can hook into any timing slot. For example, a capability
that needs to prepare something before the main `provision-tools` hooks
run would use `"pre:provision-tools"` as its hook key. Hooks are sorted
by timing first, then by dependency order within each timing group.

## Package layout

```
packages/
  types/src/capability.ts        Type definitions (CapabilityDef, CapabilityContext, etc.)
  capabilities/src/              Extension library (runner, state, utilities)
    capabilities/                Individual capability modules
      system-base/index.ts       APT packages, Node.js, systemd linger
      homebrew/index.ts          Homebrew + shell profile
      openclaw/index.ts          OpenClaw CLI + gateway stub
      checkpoint.ts              Checkpoint skill + AGENTS.md section
      tailscale.ts               Tailscale installer
      one-password/index.ts      1Password CLI + skills + AGENTS.md section
    runner.ts                    Phase runner (executes resolved hooks)
    state.ts                     State tracking (capability-state.json)
    util.ts                      Hook key parsing (basePhase, hookTiming)
    index.ts                     Public exports
  vm-cli/src/capabilities/       Application wiring
    registry.ts                  Static registry + dependency resolution
    context.ts                   CapabilityContext implementation (wires to vm-cli tools)
```

The split is intentional:

- **`@clawctl/capabilities`** contains the capability definitions and the
  generic runner. It depends only on `@clawctl/types`.
- **`vm-cli/src/capabilities/`** contains the registry (which capabilities
  exist) and the context implementation (wiring to real system tools).
  This is application policy, not part of the extension interface.

## Writing a capability

A capability is a `CapabilityDef` constant. Optional capabilities declare a
`configDef` that drives config validation (Zod is derived automatically),
TUI form rendering, sidebar help, and secret sanitization — all from one
definition.

```typescript
import { defineCapabilityConfig } from "@clawctl/types";
import type { CapabilityDef } from "@clawctl/types";

// 1. Define the config type — this is the contract
type MyToolConfig = {
  apiToken: string;
  region?: "us" | "eu";
};

export const myTool: CapabilityDef = {
  name: "my-tool",
  label: "My Tool",
  version: "1.0.0",
  core: false, // true = always enabled
  dependsOn: ["homebrew"], // runs after homebrew in same phase
  enabled: (config) => config.capabilities?.["my-tool"] !== undefined,

  // 2. Unified config definition — replaces configSchema, formDef, secretFields
  //    defineCapabilityConfig<T>() validates field paths at compile time
  configDef: defineCapabilityConfig<MyToolConfig>({
    sectionLabel: "My Tool",
    sectionHelp: { title: "My Tool", lines: ["Integration with My Tool service."] },
    fields: [
      {
        path: "apiToken", // typed: must be keyof MyToolConfig
        label: "API Token",
        type: "password",
        required: true,
        secret: true, // stripped from clawctl.json, masked in TUI
        placeholder: "mt-...",
        help: { title: "API Token", lines: ["Your My Tool API token."] },
      },
      {
        path: "region",
        label: "Region",
        type: "select",
        defaultValue: "us",
        options: [
          { label: "US", value: "us" },
          { label: "EU", value: "eu" },
        ],
      },
    ],
    summary: (v) => (v.apiToken ? `My Tool (${v.region ?? "us"})` : ""),
  }),

  // 3. Lifecycle hooks (VM-side provisioning)
  hooks: {
    "provision-tools": {
      execContext: "user",
      steps: [
        {
          name: "my-tool-install",
          label: "My Tool",
          run: async (ctx) => {
            // Use ctx.exec(), ctx.fs, ctx.apt, etc.
            return { name: "my-tool-install", status: "installed" };
          },
        },
      ],
      doctorChecks: [
        {
          name: "path-my-tool",
          availableAfter: "provision-tools",
          run: async (ctx) => ({
            passed: await ctx.commandExists("my-tool"),
          }),
        },
      ],
    },
    bootstrap: {
      execContext: "user",
      steps: [
        {
          name: "agents-md-my-tool",
          label: "AGENTS.md my-tool section",
          run: async (ctx) => {
            await ctx.agentsMd.update("my-tool", "### My Tool\n\nUsage...");
            return { name: "agents-md-my-tool", status: "installed" };
          },
        },
      ],
    },
  },
};
```

The user's config file uses the capabilities map:

```json
{
  "capabilities": {
    "my-tool": { "apiToken": "mt-abc123", "region": "eu" }
  }
}
```

### Registration

After writing the module:

1. Export it from `packages/capabilities/src/index.ts` and add it to
   `ALL_CAPABILITIES`
2. If the capability needs host-side setup (token validation, auth flows),
   add a hook entry in `packages/host-core/src/capability-hooks.ts`

The TUI wizard, config validation, sidebar help, and secret sanitization
all derive from the `configDef` automatically — no other files to edit.

### Step functions

Each step's `run` function receives a `CapabilityContext` and returns a
`ProvisionResult`:

```typescript
interface ProvisionResult {
  name: string;
  status: "installed" | "unchanged" | "failed";
  detail?: string;
  error?: string;
}
```

- **`installed`** — something changed
- **`unchanged`** — already in the desired state (idempotent skip)
- **`failed`** — error caught and returned

Steps should be idempotent: check current state before acting, return
`unchanged` if nothing needs doing. Catch errors and return `failed`
rather than throwing.

### CapabilityContext SDK

The context provides a sandboxed interface to system tools. Capabilities
never import vm-cli internals directly — they use the context:

| Category  | Methods                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Exec      | `exec(cmd, args?, opts?)`, `commandExists(cmd)`, `log(msg)`                                                                                |
| Files     | `fs.readFile`, `fs.writeFile`, `fs.mkdir`, `fs.chmod`, `fs.rename`, `fs.rm`, `fs.stat`, `fs.access`, `fs.ensureLineInFile`, `fs.ensureDir` |
| Network   | `net.downloadFile(url, dest)`, `net.downloadAndRun(url, args?)`                                                                            |
| Profile   | `profile.ensureInBashrc(line)`, `profile.ensureInProfile(line)`, `profile.ensurePath(entry)`                                               |
| APT       | `apt.install(packages)`, `apt.isInstalled(pkg)`                                                                                            |
| systemd   | `systemd.enable`, `systemd.isEnabled`, `systemd.isActive`, `systemd.daemonReload`, `systemd.enableLinger`, `systemd.findDefaultUser`       |
| AGENTS.md | `agentsMd.update(owner, content)`                                                                                                          |
| Config    | `readProvisionConfig()`                                                                                                                    |

### AGENTS.md managed sections

`ctx.agentsMd.update(owner, content)` writes a managed section to the
workspace AGENTS.md file. The `owner` string identifies the section so
it can be updated idempotently on re-provision. Sections are wrapped
with markers:

```markdown
<!-- BEGIN MANAGED SECTION: my-tool -->

### My Tool

Usage instructions for the agent...

<!-- END MANAGED SECTION: my-tool -->
```

AGENTS.md writes must use the `bootstrap` hook — not `provision-workspace`.
The workspace AGENTS.md is created by `openclaw onboard`, which runs
between the `provision-workspace` and `bootstrap` phases. Writing during
`provision-workspace` would be overwritten.

## How the runner works

When the host calls `claw provision <subcommand>`:

1. The provision command reads `provision.json` for the instance config
2. The registry resolves which capabilities are enabled and which have
   hooks for this phase
3. Hooks are sorted by timing (`pre` → `main` → `post`), then by
   dependency order within each group (topological sort)
4. The runner executes each hook's steps sequentially, logging progress:

```
=== provision-tools provisioning ===
[1/3] Homebrew
      ✓ unchanged
[2/3] Shell profile
      ✓ unchanged
[3/3] 1Password CLI
      ✓ installed — v2.30.3
=== provision-tools provisioning complete (3 steps) ===
```

5. If any step fails, the runner logs the failure and exits with a
   non-zero code. The host aborts provisioning.

## State tracking and migrations

After all steps in a hook succeed, the runner writes the capability's
version to `data/capability-state.json`:

```json
{
  "installed": {
    "system-base": { "version": "1.0.0", "installedAt": "2026-03-16T..." },
    "homebrew": { "version": "1.0.0", "installedAt": "2026-03-16T..." }
  }
}
```

On subsequent runs, if the declared version differs from the installed
version, the runner looks for a migration path. Migrations are declared
on the capability:

```typescript
migrations: [
  {
    from: "1.0.0",
    to: "2.0.0",
    run: async (ctx) => {
      // Migrate state from v1 to v2
      return { name: "my-tool-migrate-v2", status: "installed" };
    },
  },
],
```

### Versioning and migrations

There are two contexts where version drift is handled:

**Full provisioning** (`claw provision`) — the runner checks for
migrations, and if none exist (no chain declared, or a gap), falls
through to re-running the capability's provision steps. Since steps are
idempotent this is safe, though it may be slower than a targeted
migration.

**Binary updates** (`claw migrate`) — runs after a `clawctl update`
pushes a new claw binary. Only explicit migration chains are executed.
If no migration path exists, the version is bumped with no VM-side
action — the assumption is that the version bump only needed new binary
code, not VM state changes.

This means a version bump without a migration is fine when:

- The change is in claw binary code only (new command, bug fix, better
  config interface)
- The change is in provision steps that only matter for fresh installs

A migration is required when the update needs VM-side action on existing
instances:

- Config file format changes
- New files that must be written (SKILL.md, wrapper scripts)
- Package installs or removals
- systemd unit changes

### Divergence risk

Fresh provisioning always produces the "current version" state. Migrations
produce it incrementally. There is an inherent risk that a migration
chain doesn't exactly reproduce what a clean install would — for example,
a migration might forget to remove an old config key that a clean install
never creates.

The escape hatch is re-provisioning from scratch: delete the VM and
re-create it. This is always safe and produces a known-good state.

If we ever need to trigger a full re-provision during an update (without
deleting the VM), it should be built as an explicit capability hook —
not as a silent fallback from a missing migration chain.

## Core vs optional capabilities

| Capability     | Core | Enabled when                             |
| -------------- | ---- | ---------------------------------------- |
| `system-base`  | yes  | Always                                   |
| `homebrew`     | yes  | Always                                   |
| `openclaw`     | yes  | Always                                   |
| `checkpoint`   | yes  | Always                                   |
| `tailscale`    | no   | `capabilities.tailscale` in config       |
| `one-password` | no   | `capabilities["one-password"]` in config |

Core capabilities run on every instance. Optional capabilities are
activated by the instance config (`provision.json`).

## Doctor checks

Capabilities can declare health checks via `doctorChecks` on their
hooks. These integrate with `claw doctor` and follow the same
`availableAfter` pattern as built-in checks — a failing check is a
warning if its phase hasn't been reached yet, an error otherwise.

See `docs/vm-cli.md` for the full doctor checks table.

## Agent Skills (SKILL.md files)

Capabilities can install **Agent Skills** — structured instructions that
coding agents discover and load on demand. Skills follow the
[Agent Skills specification](https://agentskills.io/specification) and
live in the workspace's `.agents/skills/` directory.

A skill is a directory containing a `SKILL.md` file (YAML frontmatter +
Markdown body) plus optional `references/`, `scripts/`, and `assets/`
subdirectories. Agents load only the `name` and `description` at startup;
the full body and referenced files are loaded when the skill is activated.

Existing capability-installed skills:

- **`checkpoint`** (`checkpoint.ts`) — installs the checkpoint skill
  into the workspace during `provision-workspace`
- **`one-password`** (`one-password/skill.ts`) — installs the 1Password
  skill with wrapper scripts during `provision-tools`
