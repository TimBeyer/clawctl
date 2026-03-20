# Demo Recording

Automated terminal recordings for the README GIF, docs site, and E2E testing.
All recordings drive the **real CLI** — not mocked — so they always reflect
actual behavior.

## Requirements

```bash
brew install tmux asciinema agg
brew install --cask font-fira-code   # for Unicode spinner glyphs
```

## Quick start (README GIF)

```bash
./scripts/record-demo.sh
agg --font-dir ~/Library/Fonts docs/assets/demo.cast docs/assets/demo.gif
```

This delegates to `scripts/demos/record-create.sh` with 160-column dimensions
and outputs to the legacy `docs/assets/demo.cast` path.

## Recording all demos

```bash
./scripts/demos/record-all.sh              # Record all demos
./scripts/demos/record-all.sh create list  # Record specific demos
```

Output goes to `docs/assets/casts/<name>.cast`.

## Available demos

| Script                          | Shows                            | Requires              |
| ------------------------------- | -------------------------------- | --------------------- |
| `scripts/demos/record-create.sh`     | Interactive create wizard        | Nothing (creates VM)  |
| `scripts/demos/record-list.sh`       | `clawctl list` output            | Running instance      |
| `scripts/demos/record-management.sh` | `use`, `status`, `oc doctor`     | Running instance      |
| `scripts/demos/record-headless.sh`   | `clawctl create --config`        | Nothing (creates VM)  |

`record-all.sh` runs them in dependency order: create first (produces the VM
that list and management use), then headless last.

## E2E testing

The same scripts double as E2E tests. In test mode, recording is skipped and
sleeps are minimized — only the `assert_screen` checks run:

```bash
./scripts/demos/test-all.sh              # Test all demos
./scripts/demos/test-all.sh create       # Test specific demo
DEMO_MODE=test ./scripts/demos/record-create.sh  # Direct invocation
```

Output is TAP-formatted (`ok 1 - Config builder loaded`).

## Shared library

All demo scripts source `scripts/demos/lib.sh`, which provides:

- `setup_session "command"` — create tmux session, start asciinema (or bare command in test mode)
- `teardown_session` — kill session, trim cleanup output, print test summary
- `wait_for "pattern" [timeout]` — wait for text to appear on screen
- `assert_screen "pattern" "description"` — `wait_for` + PASS/FAIL reporting
- `type_slow "text"` — type with natural speed (50ms/char in record, instant in test)
- `down` / `up` / `enter` / `esc` — send keys with appropriate delay
- `send_key <key>` — send arbitrary tmux key
- `demo_sleep N` — full delay in record mode, 0.1s in test mode

### Configuration

Override these before calling `setup_session`:

- `SESSION` — tmux session name (default: `clawctl-demo`)
- `COLS` / `ROWS` — terminal dimensions (default: 100×35)
- `CAST` — output .cast file path
- `DEMO_MODE` — `record` (default) or `test`

## Editing storyboards

Each demo script is its own storyboard. If navigation changes (fields
reordered, sections added), adjust the `down` counts. The `assert_screen`
calls are the safety net — if navigation is wrong, the script fails instead
of silently desyncing.

## Files

| Path                            | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `scripts/demos/lib.sh`         | Shared recording/testing helpers                          |
| `scripts/demos/record-all.sh`  | Orchestrator — runs all demos in dependency order         |
| `scripts/demos/record-*.sh`    | Individual demo storyboards                               |
| `scripts/demos/test-all.sh`    | E2E test runner (runs demos in test mode)                 |
| `scripts/record-demo.sh`       | Legacy wrapper — delegates to `record-create.sh` at 160 cols |
| `docs/assets/casts/*.cast`     | Raw recordings (gitignored)                               |
| `docs/assets/demo.cast`        | Legacy README recording (gitignored)                      |
| `docs/assets/demo.gif`         | Final GIF embedded in README                              |
| `docs-site/public/casts/*.cast`| Curated recordings for the website (checked in)           |
