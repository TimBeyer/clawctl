#!/usr/bin/env bash
#
# record-headless.sh — Record headless (config-driven) provisioning.
#
# Shows: clawctl create --config <path>
#
# NOTE: This runs `clawctl create` for real with a JSON config.
# After recording you may need to clean up the created instance.
#
# Usage (from repo root):
#   ./scripts/demos/record-headless.sh

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DEMO_DIR/lib.sh"

SESSION="clawctl-headless"
CAST="${CAST:-docs/assets/casts/headless.cast}"

# Path to the headless config used for the demo.
# This file must exist — create it or point to an existing one.
CONFIG_FILE="${CONFIG_FILE:-docs/assets/demo-config.json}"

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Config file not found: $CONFIG_FILE" >&2
    echo "Create it first, or set CONFIG_FILE=/path/to/config.json" >&2
    exit 1
fi

# --- Setup ---

setup_session "clawctl create --config $CONFIG_FILE"

# --- Wait for provisioning to start ---

assert_screen "Provisioning" "Headless provisioning started"
demo_sleep 15

# --- Done ---

teardown_session

echo ""
echo "Recording saved to $CAST"
