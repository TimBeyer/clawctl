#!/bin/sh
set -eu

REPO="TimBeyer/clawctl"
BINARY_NAME="clawctl"
DEFAULT_INSTALL_DIR="${HOME}/.local/bin"
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_INSTALL_DIR}"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"

# --- Utilities ---

info() {
  printf '[clawctl] %s\n' "$*" >&2
}

error() {
  printf '[clawctl] Error: %s\n' "$*" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

trim() {
  printf '%s' "$1" | tr -d '[:space:]'
}

# --- Downloader ---

DOWNLOADER=""

detect_downloader() {
  if command_exists curl; then
    DOWNLOADER="curl"
  elif command_exists wget; then
    DOWNLOADER="wget"
  else
    error "curl or wget is required but neither was found"
  fi
}

download() {
  url="$1"
  output="$2"
  case "$DOWNLOADER" in
    curl) curl -fsSL -o "$output" "$url" ;;
    wget) wget -qO "$output" "$url" ;;
  esac
}

download_to_stdout() {
  url="$1"
  case "$DOWNLOADER" in
    curl) curl -fsSL "$url" ;;
    wget) wget -qO- "$url" ;;
  esac
}

# --- Platform Detection ---

detect_platform() {
  os="$(uname -s)"
  arch="$(uname -m)"

  case "${os}-${arch}" in
    Darwin-arm64)
      PLATFORM="darwin-arm64"
      ;;
    *)
      error "unsupported platform: ${os} ${arch}
clawctl currently supports macOS on Apple Silicon (arm64) only.
See https://github.com/${REPO} for updates."
      ;;
  esac
}

# --- Version ---

get_latest_version() {
  release_info="$(download_to_stdout "$GITHUB_API")"
  TAG="$(printf '%s' "$release_info" | grep '"tag_name"' | sed 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/')"

  if [ -z "$TAG" ]; then
    error "could not determine latest release from GitHub API"
  fi

  LATEST_VERSION="${TAG#v}"
}

check_installed_version() {
  if [ -x "${INSTALL_DIR}/${BINARY_NAME}" ]; then
    INSTALLED_VERSION="$(trim "$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>/dev/null || true)")"
    if [ -n "$INSTALLED_VERSION" ] && [ "$INSTALLED_VERSION" = "$LATEST_VERSION" ]; then
      info "${BINARY_NAME} is already up to date (v${LATEST_VERSION})"
      exit 0
    fi
    if [ -n "$INSTALLED_VERSION" ]; then
      info "updating ${BINARY_NAME} from v${INSTALLED_VERSION} to v${LATEST_VERSION}"
    fi
  fi
}

# --- Install ---

install_binary() {
  download_url="https://github.com/${REPO}/releases/download/${TAG}/${BINARY_NAME}-${PLATFORM}.zip"
  tmpdir="$(mktemp -d 2>/dev/null || mktemp -d -t clawctl)"
  if [ ! -d "$tmpdir" ]; then
    error "failed to create temporary directory"
  fi
  trap 'rm -rf "$tmpdir"' EXIT

  info "downloading ${BINARY_NAME} v${LATEST_VERSION} for ${PLATFORM}..."
  download "$download_url" "${tmpdir}/${BINARY_NAME}.zip"

  if [ ! -s "${tmpdir}/${BINARY_NAME}.zip" ]; then
    error "download failed — file is empty"
  fi

  if ! command_exists unzip; then
    error "unzip is required but was not found"
  fi

  unzip -o -q "${tmpdir}/${BINARY_NAME}.zip" -d "$tmpdir"

  if [ ! -f "${tmpdir}/${BINARY_NAME}" ]; then
    error "expected binary '${BINARY_NAME}' not found in archive"
  fi

  mkdir -p "$INSTALL_DIR" 2>/dev/null || true

  if ! install -m 755 "${tmpdir}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}" 2>/dev/null; then
    error "permission denied writing to ${INSTALL_DIR}
Try: INSTALL_DIR=<writable-dir> curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash"
  fi
}

# --- PATH Setup ---

PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'

setup_path() {
  # Only auto-configure PATH when using the default install directory
  if [ "$INSTALL_DIR" != "$DEFAULT_INSTALL_DIR" ]; then
    return
  fi

  modified=""

  for rcfile in "${HOME}/.zshrc" "${HOME}/.bashrc"; do
    if [ -f "$rcfile" ]; then
      if grep -qF '$HOME/.local/bin' "$rcfile" 2>/dev/null; then
        continue
      fi
    fi

    printf '\n%s\n' "$PATH_LINE" >> "$rcfile"
    modified="${modified} $(basename "$rcfile")"
  done

  if [ -n "$modified" ]; then
    info "added ~/.local/bin to PATH in:${modified}"
  fi
}

# --- Verify ---

verify_install() {
  installed_version="$(trim "$("${INSTALL_DIR}/${BINARY_NAME}" --version 2>/dev/null || true)")"
  if [ -z "$installed_version" ]; then
    error "installation failed — could not run ${BINARY_NAME}"
  fi

  info "${BINARY_NAME} v${installed_version} installed to ${INSTALL_DIR}/${BINARY_NAME}"

  case ":${PATH}:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
      info "restart your shell or run: source ~/.zshrc"
      ;;
  esac

  info "run '${BINARY_NAME} create' to get started"
}

# --- Main ---

main() {
  detect_downloader
  detect_platform
  get_latest_version
  check_installed_version
  install_binary
  setup_path
  verify_install
}

main "$@"
