#!/usr/bin/env bash
#
# record-all.sh — Orchestrate recording of all demo scripts.
#
# Usage (from repo root):
#   ./scripts/demos/record-all.sh              # Record all demos
#   ./scripts/demos/record-all.sh create list  # Record specific demos
#
# In test mode (E2E assertions only, no recording):
#   DEMO_MODE=test ./scripts/demos/record-all.sh
#
# Available demos: create, list, management, headless

set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DEMO_DIR/../.." && pwd)"

cd "$REPO_ROOT"

# Parse which demos to run
DEMOS=("$@")
if [[ ${#DEMOS[@]} -eq 0 ]]; then
    DEMOS=(create list management headless)
fi

FAILED=()

run_demo() {
    local name="$1"
    local script="$DEMO_DIR/record-${name}.sh"

    if [[ ! -f "$script" ]]; then
        echo "Unknown demo: $name (no script at $script)" >&2
        FAILED+=("$name")
        return
    fi

    echo ""
    echo "=== Recording: $name ==="
    echo ""

    if bash "$script"; then
        echo "=== Done: $name ==="
    else
        echo "=== FAILED: $name ===" >&2
        FAILED+=("$name")
    fi
}

# Run demos in dependency order.
# create goes first — it produces a VM that list and management use.
# headless goes last — it creates a separate instance.
ORDERED_DEMOS=()
for demo in create list management headless; do
    for requested in "${DEMOS[@]}"; do
        if [[ "$requested" == "$demo" ]]; then
            ORDERED_DEMOS+=("$demo")
        fi
    done
done

# Also add any unrecognized names (they'll get the "Unknown demo" error)
for requested in "${DEMOS[@]}"; do
    found=false
    for known in create list management headless; do
        if [[ "$requested" == "$known" ]]; then
            found=true
            break
        fi
    done
    if [[ "$found" == false ]]; then
        ORDERED_DEMOS+=("$requested")
    fi
done

for demo in "${ORDERED_DEMOS[@]}"; do
    run_demo "$demo"
done

# Summary
echo ""
echo "=== Summary ==="
echo "Recorded ${#ORDERED_DEMOS[@]} demo(s): ${ORDERED_DEMOS[*]}"

if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo "Failed: ${FAILED[*]}" >&2
    exit 1
fi

echo "All demos recorded successfully."
