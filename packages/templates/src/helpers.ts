import dedent from "dedent";

export function generateHelpersScript(): string {
  return (
    dedent`
    #!/bin/bash
    # helpers.sh — Shared idempotency functions for provisioning scripts

    command_exists() {
      command -v "$1" >/dev/null 2>&1
    }

    ensure_apt_packages() {
      local to_install=()
      for pkg in "$@"; do
        if ! dpkg -l "$pkg" 2>/dev/null | grep -q "^ii"; then
          to_install+=("$pkg")
        fi
      done
      if [ \${#to_install[@]} -gt 0 ]; then
        echo "Installing apt packages: \${to_install[*]}"
        apt-get update -qq
        apt-get install -y -qq "\${to_install[@]}"
      else
        echo "All apt packages already installed"
      fi
    }

    ensure_in_bashrc() {
      local line="$1"
      local bashrc="\${HOME}/.bashrc"
      if ! grep -qF "$line" "$bashrc" 2>/dev/null; then
        echo "$line" >> "$bashrc"
      fi
    }

    # Add a line to login profile files. Unlike .bashrc, profile files are
    # sourced by login shells regardless of interactive mode — use this for
    # PATH and env vars that must be available in non-interactive contexts
    # (e.g. limactl shell ... bash -lc "command").
    ensure_in_profile() {
      local line="$1"
      # Always write to ~/.profile
      if ! grep -qF "$line" "\${HOME}/.profile" 2>/dev/null; then
        echo "$line" >> "\${HOME}/.profile"
      fi
      # bash reads ~/.bash_profile instead of ~/.profile when it exists,
      # so write there too if present
      if [ -f "\${HOME}/.bash_profile" ]; then
        if ! grep -qF "$line" "\${HOME}/.bash_profile" 2>/dev/null; then
          echo "$line" >> "\${HOME}/.bash_profile"
        fi
      fi
    }

    ensure_dir() {
      local dir="$1"
      local mode="\${2:-755}"
      if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        chmod "$mode" "$dir"
      fi
    }
  ` + "\n"
  );
}
