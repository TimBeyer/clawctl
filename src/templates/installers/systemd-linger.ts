import dedent from "dedent";

export function generateSystemdLingerScript(): string {
  return (
    dedent`
    #!/bin/bash
    # enable-systemd-linger.sh — Enable lingering for systemd user services
    set -euo pipefail

    echo "--- systemd linger ---"

    # Determine the default non-root user.
    # logname fails in limactl shell (no controlling terminal).
    # SUDO_USER may be unset depending on how Lima chains sudo.
    # Fall back to first UID >= 1000 from /etc/passwd.
    USER="\${SUDO_USER:-}"
    if [ -z "\$USER" ]; then
      USER=\$(awk -F: '\$3 >= 1000 && \$3 < 65534 { print \$1; exit }' /etc/passwd)
    fi

    if [ -z "\$USER" ]; then
      echo "ERROR: Could not determine default user for linger" >&2
      exit 1
    fi

    loginctl enable-linger "\$USER"

    # Verify the linger file was actually created
    if [ -e "/var/lib/systemd/linger/\$USER" ]; then
      echo "systemd linger enabled for \$USER"
    else
      echo "ERROR: linger file not created for \$USER" >&2
      exit 1
    fi
  ` + "\n"
  );
}
