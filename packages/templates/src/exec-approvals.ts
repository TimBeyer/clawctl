/**
 * Generate an exec-approvals.json that pre-allowlists the `op` CLI.
 *
 * Gates `op` behind `ask: on-miss` — the user must approve the first
 * invocation, then subsequent calls are allowed automatically.
 *
 * Schema: https://docs.openclaw.ai/tools/exec-approvals
 */
export function generateExecApprovals(): string {
  const config = {
    version: 1,
    defaults: {
      security: "deny",
      ask: "on-miss",
      askFallback: "deny",
    },
    agents: {
      main: {
        security: "allowlist",
        ask: "on-miss",
        allowlist: [
          {
            pattern: "~/.local/bin/op",
          },
        ],
      },
    },
  };

  return JSON.stringify(config, null, 2);
}
