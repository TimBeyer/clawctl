/**
 * Generate a bootstrap prompt from structured agent/user identity config.
 *
 * Keeps it minimal — the agent's own BOOTSTRAP.md already knows what files
 * to create. We just provide the identity data and tell it not to wait for
 * interactive input.
 */
import dedent from "dedent";

export interface BootstrapAgent {
  name: string;
  context?: string;
}

export interface BootstrapUser {
  name: string;
  context?: string;
}

export function generateBootstrapPrompt(config: {
  agent: BootstrapAgent;
  user?: BootstrapUser;
}): string {
  const { agent, user } = config;

  const parts: string[] = [
    dedent`
      This is a non-interactive bootstrap — do not ask questions or wait for input.
      Complete your onboarding and confirm what you created.

      Your name is ${agent.name}.
    `,
  ];

  if (agent.context) {
    parts.push(agent.context);
  }

  if (user) {
    parts.push(`Your user is ${user.name}.`);
    if (user.context) {
      parts.push(user.context);
    }
  }

  return parts.join("\n\n");
}
