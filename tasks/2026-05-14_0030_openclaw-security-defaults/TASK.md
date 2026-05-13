# OpenClaw security defaults for trusted-operator setup

## Status: In Progress

## Scope

Update clawctl's post-onboard configuration so a fresh `clawctl create`
produces a gateway where the agent can immediately run shell commands,
call privileged tooling, and use slash commands — without the operator
having to shell into the VM and edit OpenClaw config by hand.

**In scope:**
- Post-onboard config writes in `host-core/bootstrap.ts`.
- New typed fields on `InstanceConfig.agent` for source-specific IDs
  that aren't auto-derivable (e.g. extra elevated allowFrom entries).
- Documentation of the trusted-operator default profile.

**Out of scope:**
- Changing the OpenClaw installer or onboarding flow itself.
- Per-agent overrides for multi-agent setups (clawctl currently
  manages a single primary agent per instance).
- Hardening / locked-down profiles for untrusted setups — we explicitly
  target the single-operator-owns-host-and-VM scenario.

## Context

A recent upstream OpenClaw release split what used to be a single
"sandbox on/off" toggle into several independent layers, all of which
must be configured for the agent to be useful. Symptoms on a fresh
`clawctl create`:

- `tools.profile=full` (we set this) — not enough on its own.
- `agents.defaults.sandbox.mode=off` (we set this only when the
  operator opted in) — also not enough.
- `exec` denied with `security=deny` even when sandbox is off.
- The agent's `/config` slash command rejected with
  "/config is disabled. Set `commands.config=true` to enable."
- `tools.elevated.enabled` exists as a separate toggle, off by default.
- Source-based gating via `tools.elevated.allowFrom.<channel>=<id>`
  exists but is empty out of the box.
- Skills triggered from scheduled (cron-style) jobs hit the same wall.

Net effect: clawctl bootstrap leaves an unusable gateway. This
contradicts clawctl's premise of "you never shell into the VM to set
things up."

Trust posture is **single-user, locally-managed, fully-trusted
operator** — same person owns host and VM, gateway is reachable only
over localhost or Tailscale. Defaults should reflect that.

## Plan

Two phases.

### Phase A — Verify upstream schema

Don't guess the exact dotpaths. Bring up a real OpenClaw install and
introspect:

- `openclaw config show` / `dump` / `print` — see effective config
  with unset defaults.
- `openclaw config help` / `--help config` — canonical dotpaths
  and value types.
- `openclaw doctor` — what it flags about exec/sandbox/elevated.
- Reproduce the failure: ask the agent to `exec uname -a` and capture
  the exact rejection reason.

Record findings in this file's Notes section.

### Phase B — Trusted-operator default profile

In `packages/host-core/src/bootstrap.ts` post-onboard config block:

- Flip `agents.defaults.sandbox.mode=off` to a default (not opt-in).
- Emit `commands.config=true` (or whichever exact key Phase A confirms).
- Emit `tools.elevated.enabled=true`.
- Auto-derive `tools.elevated.allowFrom.<channel>` from per-channel
  `allowFrom` lists already provided by the operator. The trust the
  operator placed on those IDs (this user may DM the bot) is reused
  as the trust for elevated exec (this user may run elevated exec
  from that channel). No double-entry config.
- Add scheduler/internal source to allowFrom if Phase A identifies
  one — cron jobs were configured by the trusted operator, so they
  inherit operator trust.

### Rationale: typed fields vs `openclaw` passthrough

The `openclaw` passthrough (already in place) can already inject any
dotpath, so the strict minimum would be "do nothing in code, just
document the keys." Rejected: defeats the goal of out-of-the-box
usability. Operators hit the wall first, then learn the escape.

Inverse extreme — bake everything into bootstrap.ts with no schema
surface — also rejected: `tools.elevated.allowFrom` is genuinely
user-specific (IDs from channels), so it needs a config surface unless
fully auto-derived.

Chosen: auto-set the trust toggles, expose only the user-specific
IDs as a typed field (`agent.elevated.allowFrom`). Power users keep
the `openclaw` passthrough as the catch-all escape hatch.

### Trade-offs acknowledged

- Defaults shift toward permissive. Acceptable given the trust model
  clawctl assumes; operators who want a locked-down setup can flip
  `agent.sandbox=true` and unset the elevated toggles via passthrough.
- Auto-deriving allowFrom from channel allowFrom couples two policy
  surfaces. Mitigated by: operators can override via explicit
  `agent.elevated.allowFrom`, which wins over the auto-derived
  default.

## Steps

- [ ] Phase A: spin up a fresh instance via the test config and
      introspect the live OpenClaw config schema.
- [ ] Phase A: record exact dotpaths and findings in Notes.
- [ ] Phase B: update `bootstrap.ts` post-onboard config emit.
- [ ] Phase B: extend `agentSchema` and `InstanceConfig.agent`.
- [ ] Update `docs/config-reference.md`.
- [ ] Unit tests (if there's an existing bootstrap-config test
      harness; otherwise add one).
- [ ] End-to-end: destroy + recreate via test config, confirm exec
      and slash commands work, confirm idempotency on re-run.
- [ ] Mark resolved.

## Notes

### Phase A — real schema (OpenClaw 2026.5.7)

The web research's framing was directionally right but several specifics
were wrong. The actual layers:

1. **`tools.exec.*`** (gateway config) — the primary exec gate.
   - `security`: `deny | allowlist | full`
   - `ask`: `off | on-miss | always`
   - `host`: `auto | sandbox | gateway | node`
   - Other knobs: `pathPrepend`, `safeBins`, `strictInlineEval`.
2. **`~/.openclaw/exec-approvals.json`** (host approvals file) — a
   parallel, file-based policy that's intersected with the config policy.
   - `defaults.{security, ask, askFallback}` apply to all agents.
   - `agents.<name>.{security, ask, allowlist}` override per agent.
   - "Effective" = host approvals INTERSECTED with config request.
     If the host says `security=allowlist`, that wins over config
     `security=full` ("stricter host security wins").
3. **`tools.elevated.{enabled, allowFrom}`** — separate "privileged
   surface" toggle, source-keyed (e.g. `allowFrom.telegram=[<id>]`).
   Independent of `tools.exec.*`.
4. **`commands.*`** — slash-command gating. `commands.config` is the
   `/config` slash toggle (default false). Siblings include `bash`,
   `debug`, `restart`, `text`, `mcp`, `plugins`, `native`,
   `nativeSkills`, `allowFrom`, `ownerAllowFrom`, `useAccessGroups`.
5. **`tools.profile`** — enum: `minimal | coding | messaging | full`.
6. **`tools.sandbox.tools.*`** — sandbox-specific tool policy, separate
   from `agents.defaults.sandbox.mode` (which is the on/off switch).

### Real root cause for the observed denial

`packages/capabilities/src/capabilities/one-password/op-cli.ts:99-117`
writes `~/.openclaw/exec-approvals.json` from scratch with:

```json
{
  "defaults": { "security": "deny", "ask": "on-miss", "askFallback": "deny" },
  "agents": { "main": { "security": "allowlist", "allowlist": [{"pattern": "~/.local/bin/op"}] } }
}
```

This clobbers any defaults the operator (or the yolo preset) had set.
Even if we set `tools.exec.security=full` in the gateway config, the
host approvals file says `agents.main.security=allowlist` → effective
is `allowlist` → only the `op` binary runs.

### Canonical "yolo" preset

`openclaw exec-policy preset yolo` writes BOTH:

- `data/config`: `tools.exec.security=full`, `tools.exec.ask=off`,
  `tools.exec.host=gateway`.
- `~/.openclaw/exec-approvals.json` `defaults`: `security=full`,
  `ask=off`, `askFallback=full`.

It does **not** touch `agents.<name>.*` overrides — so the 1Password
override survives the preset.

### Implementation plan refinement

1. Run `openclaw exec-policy preset yolo` once after onboard.
2. Refactor the 1Password capability so it merges instead of clobbers
   the approvals file: read existing JSON, add `~/.local/bin/op` to
   `agents.main.allowlist`, do NOT touch `defaults.*` or
   `agents.main.security`. With yolo's `defaults.security=full`, the
   per-agent override only exists if the operator explicitly created
   it; the op allowlist entry becomes harmless documentation.
3. Set `commands.config=true` (not part of yolo preset).
4. Set `tools.elevated.enabled=true` and auto-derive
   `tools.elevated.allowFrom.<channel>` from channel `allowFrom` lists.
5. Flip `agent.sandbox` default to false (was opt-in).

Step 2 is the critical fix — without it, yolo + commands.config are
still overridden by the 1Password capability.

## Outcome

(To be written when resolved.)
