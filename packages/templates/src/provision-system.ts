import dedent from "dedent";

export function generateProvisionSystemScript(): string {
  return (
    dedent`
    #!/bin/bash
    # provision-system.sh — Root-level provisioning for OpenClaw VM
    # This script is idempotent — safe to run multiple times.
    set -euo pipefail

    SCRIPTS_DIR="$(dirname "$0")"

    echo "=== System Provisioning ==="

    bash "\${SCRIPTS_DIR}/install-apt-packages.sh"
    bash "\${SCRIPTS_DIR}/install-nodejs.sh"
    bash "\${SCRIPTS_DIR}/enable-systemd-linger.sh"
    bash "\${SCRIPTS_DIR}/install-tailscale.sh"

    echo "=== System provisioning complete ==="
  ` + "\n"
  );
}
