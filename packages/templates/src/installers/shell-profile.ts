import dedent from "dedent";

export function generateShellProfileScript(): string {
  return (
    dedent`
    #!/bin/bash
    # setup-shell-profile.sh — PATH setup in .bashrc
    set -euo pipefail

    source "$(dirname "$0")/helpers.sh"

    echo "--- Shell profile ---"
    ensure_in_bashrc 'export PATH="$HOME/.local/bin:$PATH"'
    echo "Shell profile configured"
  ` + "\n"
  );
}
