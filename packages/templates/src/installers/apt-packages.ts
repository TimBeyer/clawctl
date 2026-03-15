import dedent from "dedent";

const APT_PACKAGES = ["build-essential", "git", "curl", "unzip", "jq", "ca-certificates", "gnupg"];

export function generateAptPackagesScript(): string {
  return (
    dedent`
    #!/bin/bash
    # install-apt-packages.sh — Install baseline APT packages
    set -euo pipefail

    source "$(dirname "$0")/helpers.sh"

    echo "--- APT packages ---"
    ensure_apt_packages ${APT_PACKAGES.join(" ")}
  ` + "\n"
  );
}
