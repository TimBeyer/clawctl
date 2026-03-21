#!/usr/bin/env bash
#
# lib.sh — Shared helpers for demo recording and E2E testing.
#
# Source this file at the top of each demo script:
#   DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "$DEMO_DIR/lib.sh"
#
# Then call setup_session, drive the UI, and end with wait_for_exit
# (let the command finish) or kill_session (cut the recording short).

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (override in demo scripts before calling setup_session)
# ---------------------------------------------------------------------------

SESSION="${SESSION:-clawctl-demo}"
COLS="${COLS:-100}"
ROWS="${ROWS:-35}"
CAST="${CAST:-}"

# Mode: "record" (default) or "test"
# In test mode, asciinema recording is skipped and sleeps are minimized.
DEMO_MODE="${DEMO_MODE:-record}"

# TAP test counter (used in test mode)
_TEST_NUM=0
_TEST_FAILURES=0

# ---------------------------------------------------------------------------
# Session lifecycle
# ---------------------------------------------------------------------------

setup_session() {
    local command="$1"

    tmux kill-session -t "$SESSION" 2>/dev/null || true
    tmux new-session -d -s "$SESSION" -x "$COLS" -y "$ROWS"
    sleep 0.5

    if [[ "$DEMO_MODE" == "record" ]]; then
        if [[ -z "$CAST" ]]; then
            echo "ERROR: CAST path must be set in record mode" >&2
            exit 1
        fi
        mkdir -p "$(dirname "$CAST")"
        tmux send-keys -t "$SESSION" \
            "NO_ALT_SCREEN=1 asciinema rec --cols $COLS --rows $ROWS --overwrite -c '$command' $CAST" Enter
    else
        tmux send-keys -t "$SESSION" \
            "NO_ALT_SCREEN=1 $command" Enter
    fi
}

# Wait for the command inside the tmux session to finish on its own.
# In record mode, asciinema exits when the wrapped command finishes.
# The .cast file is complete at that point — no trimming needed.
wait_for_exit() {
    local max="${1:-600}"
    echo "Waiting for command to finish..."
    for (( _we=0; _we<max; _we++ )); do
        if ! tmux has-session -t "$SESSION" 2>/dev/null; then
            break
        fi
        # The command ran inside asciinema via -c. When it exits, asciinema
        # exits too, and the shell prompt returns. Detect that by checking
        # if the pane is idle (shows a prompt, not program output).
        # We use a simple heuristic: if the .cast file exists and hasn't
        # been modified for 5 seconds, the recording is done.
        if [[ "$DEMO_MODE" == "record" && -n "$CAST" && -f "$CAST" ]]; then
            local age
            age=$(( $(date +%s) - $(stat -f %m "$CAST") ))
            if (( age >= 5 )); then
                break
            fi
        fi
        sleep 1
    done
    # Clean up the tmux session (the command has already exited)
    tmux kill-session -t "$SESSION" 2>/dev/null || true

    _print_test_summary
}

# Kill the session immediately, cutting the recording short.
# Use this when you only want a short clip (e.g. README GIF).
# Sends SIGHUP to the running command, so expect cleanup output.
kill_session() {
    tmux kill-session -t "$SESSION" 2>/dev/null || true
    sleep 1

    # Trim cleanup output caused by the signal
    if [[ "$DEMO_MODE" == "record" && -n "$CAST" && -f "$CAST" ]]; then
        local cleanup_line
        cleanup_line=$(grep -n "SIGTERM\|SIGHUP\|cleaning up\|Provisioning failed\|Deleting VM" "$CAST" | head -1 | cut -d: -f1 || true)
        if [[ -n "$cleanup_line" ]]; then
            local total
            total=$(wc -l < "$CAST" | tr -d ' ')
            echo "Trimming from line $cleanup_line (of $total) — removing cleanup output"
            head -n "$((cleanup_line - 1))" "$CAST" > "${CAST}.tmp"
            mv "${CAST}.tmp" "$CAST"
        fi
    fi

    _print_test_summary
}

_print_test_summary() {
    if [[ "$DEMO_MODE" == "test" ]]; then
        echo ""
        if (( _TEST_FAILURES > 0 )); then
            echo "FAILED: $_TEST_FAILURES of $_TEST_NUM assertions failed"
            return 1
        else
            echo "PASSED: $_TEST_NUM assertions"
        fi
    fi
}

# ---------------------------------------------------------------------------
# Input helpers
# ---------------------------------------------------------------------------

wait_for() {
    local pattern="$1"
    local max="${2:-60}"
    local i=0
    while ! tmux capture-pane -t "$SESSION" -p | grep -qF "$pattern"; do
        sleep 0.5
        ((i++)) || true
        if (( i >= max )); then
            echo "Timeout waiting for: $pattern" >&2
            if [[ "$DEMO_MODE" == "test" ]]; then
                echo "  Screen contents:" >&2
                tmux capture-pane -t "$SESSION" -p >&2
            fi
            return 1
        fi
    done
}

type_slow() {
    local text="$1"
    local delay="${2:-0.05}"
    if [[ "$DEMO_MODE" == "test" ]]; then
        # In test mode, send the whole string at once
        tmux send-keys -t "$SESSION" -l "$text"
    else
        for (( i=0; i<${#text}; i++ )); do
            tmux send-keys -t "$SESSION" -l "${text:$i:1}"
            sleep "$delay"
        done
    fi
}

send_key() {
    tmux send-keys -t "$SESSION" "$@"
}

down() {
    send_key Down
    demo_sleep 0.3
}

up() {
    send_key Up
    demo_sleep 0.3
}

enter() {
    send_key Enter
    demo_sleep 0.3
}

esc() {
    send_key Escape
    demo_sleep 0.3
}

# Sleep that respects demo mode — full delay for recording, minimal for testing
demo_sleep() {
    if [[ "$DEMO_MODE" == "record" ]]; then
        sleep "$1"
    else
        sleep 0.1
    fi
}

# ---------------------------------------------------------------------------
# Assertions (used in both modes, but only report in test mode)
# ---------------------------------------------------------------------------

assert_screen() {
    local pattern="$1"
    local desc="${2:-$pattern}"
    local timeout="${3:-30}"

    (( _TEST_NUM++ )) || true

    if wait_for "$pattern" "$timeout"; then
        if [[ "$DEMO_MODE" == "test" ]]; then
            echo "ok $_TEST_NUM - $desc"
        fi
    else
        (( _TEST_FAILURES++ )) || true
        if [[ "$DEMO_MODE" == "test" ]]; then
            echo "not ok $_TEST_NUM - $desc"
        else
            echo "FAIL: Expected to see: $desc (pattern: $pattern)" >&2
            tmux kill-session -t "$SESSION" 2>/dev/null
            exit 1
        fi
    fi
}
