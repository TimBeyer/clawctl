# clawctl Daemon Package (`@clawctl/daemon`)

## Status: Resolved

## Scope

Implement a new `@clawctl/daemon` package that provides a background daemon
process for managing clawctl instances. The daemon runs as the same `clawctl`
binary via `clawctl daemon run`, uses a Unix domain socket for IPC, and a
tick-based task scheduler for periodic work (checkpoint watching, health
monitoring).

**In scope:**

- New `packages/daemon/` package with IPC server/client, lifecycle management,
  task scheduler, structured logging
- Checkpoint watch task (ported from `cli/commands/watch.ts`)
- Health monitor task (new)
- CLI `daemon` subcommand group (start/stop/restart/status/logs/run)
- Auto-start daemon via `ensureDaemon()` in instance-targeting commands
- Update `clawctl watch` to delegate to daemon when running

**Out of scope:**

- Launchd/systemd service generation
- Auto-upgrade, log aggregation, notifications (future tasks)
- Desktop notifications

## Plan

1. Package scaffolding — `packages/daemon/package.json`, `tsconfig.json`, `paths.ts`, `config.ts`
2. Logging — `logging.ts` (structured NDJSON writer + rotation)
3. Lifecycle — `lifecycle.ts` (PID file, isDaemonRunning, spawnDaemon, stopDaemon, ensureDaemon)
4. IPC layer — `server.ts` (Unix socket server), `client.ts` (connect/send/receive)
5. Task system — `tasks/types.ts`, `scheduler.ts`, `tasks/registry.ts`
6. Daemon runner — `run.ts` (main daemon loop)
7. Checkpoint task — `tasks/checkpoint-watch.ts` (port from watch.ts)
8. Health monitor task — `tasks/health-monitor.ts`
9. CLI integration — `cli/src/commands/daemon.ts`, wire into `cli.tsx`
10. Auto-start wiring — add `ensureDaemon()` to instance-targeting commands
11. Watch migration — update watch.ts to delegate when daemon running
12. Documentation and CLAUDE.md updates

## Steps

- [x] Create task + branch
- [x] Package scaffolding
- [x] Paths and config modules
- [x] Structured logging with rotation
- [x] PID file and lifecycle management
- [x] IPC server (Unix socket, NDJSON)
- [x] IPC client
- [x] Task types and scheduler
- [x] Task registry
- [x] Checkpoint watch task
- [x] Health monitor task
- [x] Daemon run entry point
- [x] Package index exports
- [x] CLI daemon commands
- [x] Wire daemon commands into cli.tsx
- [x] Auto-start (ensureDaemon) in instance commands
- [x] Watch command delegation
- [x] Update CLAUDE.md and docs
- [x] Verify: lint, format, type-check

## Notes

- Daemon is NOT a separate binary — it's `clawctl daemon run` (hidden subcommand)
- Self-spawning detects compiled vs dev mode via `process.execPath`
- Unix socket at `~/.config/clawctl/daemon.sock`
- NDJSON protocol: one JSON object per line, short-lived connections
- Task scheduler: 1s setInterval, checks due tasks by last-run timestamp
- Per-instance tasks multiplexed by `{task}:{instance}` key

## Outcome

Delivered the full `@clawctl/daemon` package with:

- **13 source files** in `packages/daemon/src/` covering IPC server/client,
  lifecycle management (PID file, spawn, stop, ensureDaemon with version
  upgrade), tick-based task scheduler, structured NDJSON logging with rotation,
  daemon config loading, and two tasks.
- **Checkpoint watch task** — ported from `cli/commands/watch.ts` with identical
  logic (fs.watch + polling fallback, nested .git guard, git add/commit/cleanup).
- **Health monitor task** — polls `driver.status()` per-instance, detects
  transitions, logs warnings on unexpected stops, optional `autoRestart`.
- **CLI commands** — `daemon start/stop/restart/status/logs/run` wired into
  `cli.tsx` as a subcommand group. `run` is hidden (internal).
- **Auto-start** — `ensureDaemon()` added to 7 instance-targeting commands
  (start, stop, status, restart, delete, shell, openclaw). Silent by default.
- **Watch migration** — `clawctl watch` delegates to daemon when running,
  starts daemon if not running, falls back to foreground mode on failure.
- **Documentation** — `docs/daemon.md`, updated `docs/architecture.md` and
  `CLAUDE.md` workspace structure.

**Deferred:**
- Unit tests for scheduler, IPC protocol, lifecycle (should be added before
  shipping to production)
- Integration test (start daemon, send IPC, stop)
- Launchd service generation
