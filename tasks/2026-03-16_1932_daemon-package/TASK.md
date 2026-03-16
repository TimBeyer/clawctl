# clawctl Daemon Package (`@clawctl/daemon`)

## Status: In Progress

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
- [ ] Package scaffolding
- [ ] Paths and config modules
- [ ] Structured logging with rotation
- [ ] PID file and lifecycle management
- [ ] IPC server (Unix socket, NDJSON)
- [ ] IPC client
- [ ] Task types and scheduler
- [ ] Task registry
- [ ] Checkpoint watch task
- [ ] Health monitor task
- [ ] Daemon run entry point
- [ ] Package index exports
- [ ] CLI daemon commands
- [ ] Wire daemon commands into cli.tsx
- [ ] Auto-start (ensureDaemon) in instance commands
- [ ] Watch command delegation
- [ ] Update CLAUDE.md and docs
- [ ] Verify: lint, format, type-check

## Notes

- Daemon is NOT a separate binary — it's `clawctl daemon run` (hidden subcommand)
- Self-spawning detects compiled vs dev mode via `process.execPath`
- Unix socket at `~/.config/clawctl/daemon.sock`
- NDJSON protocol: one JSON object per line, short-lived connections
- Task scheduler: 1s setInterval, checks due tasks by last-run timestamp
- Per-instance tasks multiplexed by `{task}:{instance}` key

## Outcome

(To be written when resolved)
