#!/usr/bin/env bash
#
# test-all.sh — Run all demo scripts in test mode (E2E assertions, no recording).
#
# Usage (from repo root):
#   ./scripts/demos/test-all.sh
#   ./scripts/demos/test-all.sh create  # Test specific demo

set -euo pipefail

export DEMO_MODE=test

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "TAP version 13"
echo ""

exec "$DEMO_DIR/record-all.sh" "$@"
