#!/usr/bin/env bash
#
# record-management.sh — Record day-to-day management commands.
#
# Shows: clawctl use, clawctl status, clawctl oc doctor
#
# Requires: at least one existing clawctl instance.
#
# Usage (from repo root):
#   ./scripts/demos/record-management.sh

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DEMO_DIR/lib.sh"

SESSION="clawctl-mgmt"
COLS="${COLS:-100}"
ROWS="${ROWS:-30}"
CAST="${CAST:-docs/assets/casts/management.cast}"

# --- Setup ---
# We record a plain shell session and type commands into it.

setup_session "bash --norc --noprofile"

# Wait for shell prompt
demo_sleep 1

# Set a clean prompt for the recording
send_key -l 'export PS1="$ "'
enter
demo_sleep 0.5

# --- Scene 1: Set default instance ---

type_slow "clawctl use hal"
demo_sleep 0.5
enter
assert_screen "hal" "Instance set to hal"
demo_sleep 2

# --- Scene 2: Check status ---

type_slow "clawctl status"
demo_sleep 0.5
enter
assert_screen "Running" "Status shows running"
demo_sleep 3

# --- Scene 3: Run doctor ---

type_slow "clawctl oc doctor"
demo_sleep 0.5
enter
# Doctor output varies — wait for completion marker
assert_screen "checks passed" "Doctor checks completed"
demo_sleep 3

# --- Done ---

teardown_session

echo ""
echo "Recording saved to $CAST"
