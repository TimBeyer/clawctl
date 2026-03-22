#!/usr/bin/env bash
#
# record-list.sh — Record the clawctl list output.
#
# Requires: at least one existing clawctl instance.
#
# Usage (from repo root):
#   ./scripts/demos/record-list.sh

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DEMO_DIR/lib.sh"

SESSION="clawctl-list"
CAST="${CAST:-docs/assets/casts/list.cast}"

# --- Setup ---

setup_session "clawctl list"

# --- Wait for output and exit ---

assert_screen "NAME" "List header row shown"
wait_for_exit 30

echo ""
echo "Recording saved to $CAST"
