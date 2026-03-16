# Daemon

The clawctl daemon is a background process that manages all registered
instances. It handles checkpoint watching, health monitoring, and provides
the foundation for future periodic tasks (auto-upgrades, log aggregation,
notifications).

## Architecture

The daemon is **not a separate binary** — it's `clawctl daemon run`, the
same executable running in a different mode. This means:

- Single distributable binary
- Version always matches the CLI
- Dev mode works naturally (`bun cli.tsx daemon run`)

```
CLI (clawctl daemon start/stop/status)
  │
  │ Unix socket (NDJSON)
  ▼
Daemon process (clawctl daemon run)
  ├─ IPC server (daemon.sock)
  ├─ Scheduler (1s tick loop)
  │  ├─ checkpoint-watch (per-instance, fs.watch + polling fallback)
  │  └─ health-monitor   (per-instance, 60s interval)
  ├─ VMDriver → Lima
  └─ Registry → instances.json
```

## Files

All daemon state lives under `~/.config/clawctl/`:

| File                     | Purpose                                     |
| ------------------------ | ------------------------------------------- |
| `daemon.pid`             | PID file for lifecycle tracking             |
| `daemon.sock`            | Unix domain socket for IPC                  |
| `daemon.json`            | Optional config (all tasks work without it) |
| `logs/daemon.log`        | Structured NDJSON log                       |
| `logs/daemon.stdout.log` | Captured process stdout                     |
| `logs/daemon.stderr.log` | Captured process stderr                     |

## CLI Commands

```
clawctl daemon start        Start the background daemon
clawctl daemon stop         Stop the running daemon
clawctl daemon restart      Stop + start
clawctl daemon status       Show daemon status, watched instances, task states
clawctl daemon logs         Show recent log lines
clawctl daemon logs -f      Tail logs (follow mode)
clawctl daemon run          (hidden) Run daemon in foreground — for debugging
```

## Auto-Start

Instance-targeting commands (`start`, `stop`, `status`, `restart`, `delete`,
`shell`, `openclaw`) automatically start the daemon if it's not running.
This is transparent — no output unless `--verbose` is set.

The `ensureDaemon()` helper also handles version upgrades: if the running
daemon is an older version, it's stopped and restarted with the current CLI.

## Configuration

Optional file at `~/.config/clawctl/daemon.json`:

```json
{
  "autoWatch": true,
  "logLevel": "info",
  "tasks": {
    "checkpoint": {
      "pollIntervalMs": 2000
    },
    "healthMonitor": {
      "intervalMs": 60000,
      "autoRestart": false
    }
  }
}
```

All fields are optional. Defaults: all tasks enabled, `autoRestart: false`
(log-only), auto-watch all registered instances.

## IPC Protocol

Newline-delimited JSON over Unix socket. Short-lived connections.

```typescript
// Request
{ "id": "abc123", "method": "ping" }

// Response
{ "id": "abc123", "ok": true, "data": { "pid": 12345, "uptime": 3600, "version": "0.12.0" } }
```

Methods: `ping`, `status`, `reload`, `shutdown`.

## Tasks

### Checkpoint Watch

Watches each instance's `data/` directory for `.checkpoint-request` signal
files. When detected: `git add data/` → `git commit` → remove signal file.

Uses `fs.watch` by default for near-instant response. Falls back to polling
(2s) if `fs.watch` fails (e.g. virtiofs quirks).

### Health Monitor

Polls `driver.status()` every 60s. Detects status transitions (Running →
Stopped/Unknown) and logs them. If `autoRestart: true`, calls
`driver.start()` on unexpected stops.

## Watch Command Migration

`clawctl watch` now checks if the daemon is running:

1. If daemon is running → prints message that daemon handles watching, exits
2. If daemon is not running → starts daemon (which takes over watching)
3. If daemon fails to start → falls back to foreground mode (original behavior)

This is a smooth migration — no breaking change.

## Logging

Format: NDJSON with `ts`, `level`, `task`, `instance`, `msg` fields.
Rotation: 10MB limit, rotates to `.log.1`.

View logs with `clawctl daemon logs` or read the file directly.
