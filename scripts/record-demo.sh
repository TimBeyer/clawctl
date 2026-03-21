#!/usr/bin/env bash
#
# record-demo.sh — Record the clawctl create wizard demo (README GIF).
#
# This is a convenience wrapper that delegates to scripts/demos/record-create.sh
# with the original 160-column dimensions and demo.cast output path.
#
# Usage (from repo root):
#   ./scripts/record-demo.sh
#   agg --font-dir ~/Library/Fonts docs/assets/demo.cast docs/assets/demo.gif
#
# Requirements: tmux, asciinema, agg
#
# NOTE: This runs `clawctl create` for real. After recording you may
# need to clean up: limactl delete hal

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Override output to the legacy path for backward compatibility.
# The README references docs/assets/demo.cast → demo.gif.
export CAST="docs/assets/demo.cast"

exec "$SCRIPT_DIR/demos/record-create.sh"
