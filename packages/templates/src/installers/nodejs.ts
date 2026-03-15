import dedent from "dedent";

const NODE_MAJOR_VERSION = 22;
const NODESOURCE_SETUP_URL = (majorVersion: number) =>
  `https://deb.nodesource.com/setup_${majorVersion}.x`;

export function generateNodejsScript(): string {
  return (
    dedent`
    #!/bin/bash
    # install-nodejs.sh — Install Node.js ${NODE_MAJOR_VERSION} via NodeSource
    set -euo pipefail

    source "$(dirname "$0")/helpers.sh"

    echo "--- Node.js ${NODE_MAJOR_VERSION} ---"
    if ! command_exists node || ! node --version | grep -q "v${NODE_MAJOR_VERSION}"; then
      echo "Installing Node.js ${NODE_MAJOR_VERSION}..."
      curl -fsSL ${NODESOURCE_SETUP_URL(NODE_MAJOR_VERSION)} | bash -
      apt-get install -y nodejs
      echo "Node.js $(node --version) installed"
    else
      echo "Node.js $(node --version) already installed"
    fi
  ` + "\n"
  );
}
