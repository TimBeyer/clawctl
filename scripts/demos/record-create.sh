#!/usr/bin/env bash
#
# record-create.sh — Record the clawctl create wizard demo.
#
# Usage (from repo root):
#   ./scripts/demos/record-create.sh
#
# Set WAIT_FOR_COMPLETION=1 to let provisioning finish (required when
# other demos need the running instance afterward). Without it, the
# recording ends after ~20 seconds of provisioning — enough for the
# README GIF.
#
# NOTE: This runs `clawctl create` for real. After recording you may
# need to clean up: limactl delete hal

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DEMO_DIR/../.." && pwd)"
source "$DEMO_DIR/lib.sh"

# Load API key from .env.local if present
if [[ -f "$REPO_ROOT/.env.local" ]]; then
    # shellcheck disable=SC1091
    source "$REPO_ROOT/.env.local"
fi

DEMO_API_KEY="${DEMO_API_KEY:-sk-ant-api03-xYzDeMoKeY}"
DEMO_PROVIDER="${DEMO_PROVIDER:-zai}"

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
assert_screen "$DEMO_PROVIDER" "Provider type select shows $DEMO_PROVIDER"
demo_sleep 1

# Navigate to the target provider in the list.
# Provider order: anthropic(0), openai(1), gemini(2), zai(3), mistral(4), ...
case "$DEMO_PROVIDER" in
    anthropic) ;;
    openai)    down ;;
    gemini)    down; down ;;
    zai)       down; down; down ;;
    mistral)   down; down; down; down ;;
    *)         echo "Unknown DEMO_PROVIDER: $DEMO_PROVIDER — add navigation to record-create.sh" >&2; exit 1 ;;
esac

# Select provider
enter
demo_sleep 0.5

# --- Scene 4: Fill API key ---

down
enter
demo_sleep 0.3
type_slow "$DEMO_API_KEY"
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

if [[ "${WAIT_FOR_COMPLETION:-}" == "1" ]]; then
    # Let the command run to completion. clawctl create exits on its own
    # after provisioning finishes. asciinema exits when the wrapped command
    # does. We just wait for it all to finish.
    wait_for_exit 600
else
    # For the README GIF: just show the first ~20 seconds of progress,
    # then cut. This kills the process (triggering VM cleanup).
    demo_sleep 20
    kill_session
fi

echo ""
echo "Recording saved to $CAST"
