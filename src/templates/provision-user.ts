import dedent from "dedent";

export function generateProvisionUserScript(): string {
  return (
    dedent`
    #!/bin/bash
    # provision-user.sh — User-level provisioning for OpenClaw VM
    # This script is idempotent — safe to run multiple times.
    set -euo pipefail

    SCRIPTS_DIR="$(dirname "$0")"

    echo "=== User Provisioning ==="

    bash "\${SCRIPTS_DIR}/install-homebrew.sh"
    bash "\${SCRIPTS_DIR}/install-op-cli.sh"
    bash "\${SCRIPTS_DIR}/setup-shell-profile.sh"
    bash "\${SCRIPTS_DIR}/install-openclaw.sh"
    bash "\${SCRIPTS_DIR}/setup-gateway-stub.sh"

    echo ""
    echo "=== User provisioning complete ==="
  ` + "\n"
  );
}
