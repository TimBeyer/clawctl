import dedent from "dedent";

const OPENCLAW_INSTALL_URL = "https://openclaw.ai/install.sh";

export function generateOpenclawScript(): string {
  return (
    dedent`
    #!/bin/bash
    # install-openclaw.sh — Install OpenClaw CLI via official installer
    set -euo pipefail

    source "$(dirname "$0")/helpers.sh"

    echo "--- OpenClaw ---"
    if ! command_exists openclaw; then
      echo "Installing OpenClaw..."
      curl -fsSL ${OPENCLAW_INSTALL_URL} | bash -s -- --no-onboard --no-prompt

      # The official installer puts the binary at ~/.npm-global/bin/openclaw.
      # Add it to PATH directly — sourcing .bashrc doesn't work because
      # Ubuntu's .bashrc has an interactive guard that returns early in
      # non-interactive shells (which is what provisioning runs in).
      export PATH="$HOME/.npm-global/bin:$PATH"

      if ! command_exists openclaw; then
        echo "ERROR: openclaw not found on PATH after installation"
        echo "PATH=$PATH"
        exit 1
      fi
      echo "OpenClaw $(openclaw --version) installed"
    else
      echo "OpenClaw already installed"
    fi

    # Ensure ~/.npm-global/bin is in PATH. Use ensure_in_profile so it's
    # available in non-interactive login shells (limactl shell ... bash -lc).
    # Ubuntu's .bashrc has an interactive guard that skips everything in
    # non-interactive shells, so .bashrc alone is not sufficient.
    ensure_in_profile 'export PATH="$HOME/.npm-global/bin:$PATH"'

    # Configure env vars to persist state/config to mounted project directory.
    # These also go in profile so shellExec (bash -lc) picks them up.
    ensure_in_profile 'export OPENCLAW_STATE_DIR=/mnt/project/data/state'
    ensure_in_profile 'export OPENCLAW_CONFIG_PATH=/mnt/project/data/config'
    echo "OpenClaw env vars configured"
  ` + "\n"
  );
}
