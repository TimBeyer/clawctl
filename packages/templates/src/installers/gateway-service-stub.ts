import dedent from "dedent";

/**
 * Workaround for an openclaw bug: `openclaw daemon install` runs
 * `systemctl --user is-enabled openclaw-gateway.service` as a pre-check
 * and treats ANY non-zero exit as "systemctl unavailable" — including
 * exit 1 (disabled) and exit 4 (not-found). By pre-creating and enabling
 * a stub unit, the check returns 0 and the real install proceeds.
 *
 * The stub is replaced by `openclaw daemon install --force` during
 * onboarding.
 */
export function generateGatewayServiceStubScript(): string {
  return (
    dedent`
    #!/bin/bash
    # setup-gateway-stub.sh — Pre-create a stub systemd unit for openclaw-gateway
    set -euo pipefail

    echo "--- gateway service stub ---"

    if systemctl --user is-enabled openclaw-gateway.service &>/dev/null; then
      echo "openclaw-gateway.service already enabled, skipping stub"
      exit 0
    fi

    UNIT_DIR="\$HOME/.config/systemd/user"
    mkdir -p "\$UNIT_DIR"

    cat > "\$UNIT_DIR/openclaw-gateway.service" << 'UNIT'
    [Unit]
    Description=OpenClaw Gateway (stub — replaced by openclaw daemon install)

    [Service]
    ExecStart=/bin/true

    [Install]
    WantedBy=default.target
    UNIT

    systemctl --user daemon-reload
    systemctl --user enable openclaw-gateway.service

    echo "gateway service stub enabled"
  ` + "\n"
  );
}
