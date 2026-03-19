#!/usr/bin/env bash
#
# record-demo.sh — Record the clawctl create wizard demo.
#
# Uses tmux for reliable keystroke delivery and screen content detection,
# with asciinema for clean terminal recording. Convert with agg afterward.
#
# Usage (from repo root):
#   ./scripts/record-demo.sh
#   agg docs/assets/demo.cast docs/assets/demo.gif
#
# Requirements: tmux, asciinema, agg
#
# NOTE: This runs `clawctl create` for real. After recording you may
# need to clean up: limactl delete hal

set -euo pipefail

CAST="docs/assets/demo.cast"
SESSION="clawctl-demo"
COLS=160
ROWS=35

# --- Helpers ---

wait_for() {
    local pattern="$1"
    local max=60
    local i=0
    while ! tmux capture-pane -t "$SESSION" -p | grep -qF "$pattern"; do
        sleep 0.5
        ((i++))
        if (( i >= max )); then
            echo "Timeout waiting for: $pattern" >&2
            tmux kill-session -t "$SESSION" 2>/dev/null
            exit 1
        fi
    done
}

type_slow() {
    local text="$1"
    for (( i=0; i<${#text}; i++ )); do
        tmux send-keys -t "$SESSION" -l "${text:$i:1}"
        sleep 0.05
    done
}

down() {
    tmux send-keys -t "$SESSION" Down
    sleep 0.3
}

# --- Setup ---

tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" -x "$COLS" -y "$ROWS"
sleep 0.5

# Start asciinema recording wrapping clawctl create
tmux send-keys -t "$SESSION" \
    "NO_ALT_SCREEN=1 asciinema rec --cols $COLS --rows $ROWS --overwrite -c 'clawctl create' $CAST" Enter

# --- Scene 1: Wait for config builder ---

wait_for "Review & Create"
sleep 2

# --- Scene 2: Type instance name "hal" ---

tmux send-keys -t "$SESSION" Enter
sleep 0.5
type_slow "hal"
sleep 1
tmux send-keys -t "$SESSION" Enter
sleep 1

# --- Scene 3: Navigate to Provider and expand ---

# name → project → resources → provider
down; down; down
tmux send-keys -t "$SESSION" Enter
sleep 0.5

# Move to provider.type
down

# Open provider type select
tmux send-keys -t "$SESSION" Enter
wait_for "anthropic"
sleep 1

# Select anthropic
tmux send-keys -t "$SESSION" Enter
sleep 0.5

# --- Scene 4: Fill API key ---

down
tmux send-keys -t "$SESSION" Enter
sleep 0.3
type_slow "sk-ant-api03-xYzDeMoKeY"
sleep 0.8
tmux send-keys -t "$SESSION" Enter
sleep 0.5

# Collapse provider
tmux send-keys -t "$SESSION" Escape
sleep 0.8

# --- Scene 5: Agent Identity ---

# provider → network → cap:tailscale → cap:one-password → bootstrap
down; down; down; down

# Expand bootstrap (Agent Identity)
tmux send-keys -t "$SESSION" Enter
sleep 0.5

# Agent Name
down
tmux send-keys -t "$SESSION" Enter
sleep 0.3
type_slow "Hal"
sleep 0.5
tmux send-keys -t "$SESSION" Enter
sleep 0.3

# Agent Vibe
down
tmux send-keys -t "$SESSION" Enter
sleep 0.3
type_slow "Calm, precise, just a little too helpful."
sleep 0.8
tmux send-keys -t "$SESSION" Enter
sleep 0.5

# Collapse bootstrap
tmux send-keys -t "$SESSION" Escape
sleep 1

# --- Scene 6: Review ---

tmux send-keys -t "$SESSION" "r"
wait_for "Review Configuration"
sleep 3

# --- Scene 7: Start provisioning ---

tmux send-keys -t "$SESSION" Enter
wait_for "Provisioning"
sleep 20

# --- Done ---

# Kill the session. asciinema writes .cast incrementally, so the file
# is complete up to this point.
tmux kill-session -t "$SESSION" 2>/dev/null || true
sleep 1

# Trim everything after cleanup signals appear in the recording.
# Find the first line containing cleanup text and keep everything before it.
if [[ -f "$CAST" ]]; then
    cleanup_line=$(grep -n "SIGTERM\|SIGHUP\|cleaning up\|Provisioning failed\|Deleting VM" "$CAST" | head -1 | cut -d: -f1)
    if [[ -n "$cleanup_line" ]]; then
        total=$(wc -l < "$CAST" | tr -d ' ')
        echo "Trimming from line $cleanup_line (of $total) — removing cleanup output"
        head -n "$((cleanup_line - 1))" "$CAST" > "${CAST}.tmp"
        mv "${CAST}.tmp" "$CAST"
    fi
fi

echo ""
echo "Recording saved to $CAST"
echo "Convert to GIF:  agg $CAST docs/assets/demo.gif"
