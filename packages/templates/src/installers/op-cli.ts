import dedent from "dedent";

const OP_VERSION = "2.30.0";
const OP_DOWNLOAD_URL = (version: string) =>
  `https://cache.agilebits.com/dist/1P/op2/pkg/v${version}/op_linux_arm64_v${version}.zip`;

export function generateOpCliScript(): string {
  return (
    dedent`
    #!/bin/bash
    # install-op-cli.sh — Install 1Password CLI arm64 binary
    set -euo pipefail

    source "$(dirname "$0")/helpers.sh"

    echo "--- 1Password CLI ---"
    if ! command_exists op; then
      echo "Installing 1Password CLI..."
      mkdir -p ~/.local/bin
      curl -fsSL "${OP_DOWNLOAD_URL(OP_VERSION)}" -o /tmp/op.zip
      unzip -o /tmp/op.zip -d /tmp/op
      mv /tmp/op/op ~/.local/bin/op
      chmod +x ~/.local/bin/op
      rm -rf /tmp/op /tmp/op.zip

      # Ensure ~/.local/bin is in PATH
      if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
      fi
      echo "1Password CLI installed"
    else
      echo "1Password CLI already installed"
    fi
  ` + "\n"
  );
}
