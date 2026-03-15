import dedent from "dedent";

/**
 * Generate a wrapper script that makes `op` work in OpenClaw's exec environment.
 *
 * The exec tool doesn't source ~/.profile, so OP_SERVICE_ACCOUNT_TOKEN is not
 * available. This wrapper reads the token from the secrets file (already
 * persisted by credentials setup) and execs the real binary.
 *
 * During bootstrap: the real binary is moved from ~/.local/bin/op to
 * ~/.local/bin/.op-real, and this wrapper takes its place at ~/.local/bin/op.
 */
export function generateOpWrapperScript(): string {
  return dedent`
    #!/bin/sh
    TOKEN_FILE="\${HOME}/.openclaw/secrets/op-token"
    if [ -f "$TOKEN_FILE" ]; then
      export OP_SERVICE_ACCOUNT_TOKEN=$(cat "$TOKEN_FILE")
    fi
    exec "\${HOME}/.local/bin/.op-real" "$@"
  `;
}
