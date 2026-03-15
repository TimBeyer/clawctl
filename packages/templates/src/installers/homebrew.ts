import dedent from "dedent";

const HOMEBREW_INSTALL_URL = "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh";

export function generateHomebrewScript(): string {
  return (
    dedent`
    #!/bin/bash
    # install-homebrew.sh — Install Homebrew (Linuxbrew)
    set -euo pipefail

    source "$(dirname "$0")/helpers.sh"

    echo "--- Homebrew ---"
    if ! command_exists brew; then
      echo "Installing Homebrew..."
      NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL ${HOMEBREW_INSTALL_URL})"

      # Add brew to PATH for this session
      eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
      echo "Homebrew installed"
    else
      echo "Homebrew already installed"
    fi

    # Persist brew PATH in profile files so it's available in non-interactive
    # login shells (limactl shell ... bash -lc). Ubuntu's .bashrc has an
    # interactive guard that skips everything in non-interactive shells.
    ensure_in_profile 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"'
  ` + "\n"
  );
}
