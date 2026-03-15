import dedent from "dedent";

const TAILSCALE_INSTALL_URL = "https://tailscale.com/install.sh";

export function generateTailscaleScript(): string {
  return (
    dedent`
    #!/bin/bash
    # install-tailscale.sh — Install Tailscale client
    set -euo pipefail

    source "$(dirname "$0")/helpers.sh"

    echo "--- Tailscale ---"
    if ! command_exists tailscale; then
      echo "Installing Tailscale..."
      curl -fsSL ${TAILSCALE_INSTALL_URL} | bash
      echo "Tailscale installed"
    else
      echo "Tailscale already installed"
    fi
  ` + "\n"
  );
}
