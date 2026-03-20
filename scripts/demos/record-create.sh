#!/usr/bin/env bash
#
# record-create.sh — Record the clawctl create wizard demo.
#
# Usage (from repo root):
#   ./scripts/demos/record-create.sh
#
# Produces: docs/assets/casts/create.cast
#
# NOTE: This runs `clawctl create` for real. After recording you may
# need to clean up: limactl delete hal

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DEMO_DIR/lib.sh"

SESSION="clawctl-create"
CAST="${CAST:-docs/assets/casts/create.cast}"

# --- Setup ---

setup_session "clawctl create"

# --- Scene 1: Wait for config builder ---

assert_screen "Review & Create" "Config builder loaded"
demo_sleep 2

# --- Scene 2: Type instance name "hal" ---

enter
demo_sleep 0.5
type_slow "hal"
demo_sleep 1
enter
demo_sleep 1

# --- Scene 3: Navigate to Provider and expand ---

# name → project → resources → provider
down; down; down
enter
demo_sleep 0.5

# Move to provider.type
down

# Open provider type select
enter
assert_screen "anthropic" "Provider type select shows anthropic"
demo_sleep 1

# Select anthropic
enter
demo_sleep 0.5

# --- Scene 4: Fill API key ---

down
enter
demo_sleep 0.3
type_slow "sk-ant-api03-xYzDeMoKeY"
demo_sleep 0.8
enter
demo_sleep 0.5

# Collapse provider
esc
demo_sleep 0.8

# --- Scene 5: Agent Identity ---

# provider → network → cap:tailscale → cap:one-password → bootstrap
down; down; down; down

# Expand bootstrap (Agent Identity)
enter
demo_sleep 0.5

# Agent Name
down
enter
demo_sleep 0.3
type_slow "Hal"
demo_sleep 0.5
enter
demo_sleep 0.3

# Agent Vibe
down
enter
demo_sleep 0.3
type_slow "Calm, precise, just a little too helpful."
demo_sleep 0.8
enter
demo_sleep 0.5

# Collapse bootstrap
esc
demo_sleep 1

# --- Scene 6: Review ---

send_key "r"
assert_screen "Review Configuration" "Review screen shown"
demo_sleep 3

# --- Scene 7: Start provisioning ---

enter
assert_screen "Provisioning" "Provisioning started"
demo_sleep 20

# --- Done ---

teardown_session

echo ""
echo "Recording saved to $CAST"
