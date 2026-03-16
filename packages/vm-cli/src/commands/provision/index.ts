import { Command } from "commander";
import { setJsonMode, ok, fail } from "../../output.js";
import { runPhase } from "@clawctl/capabilities";
import { createCapabilityContext } from "../../capabilities/context.js";
import { getHooksForPhase } from "../../capabilities/registry.js";
import { readProvisionConfig } from "../../tools/provision-config.js";
import type { LifecyclePhase } from "@clawctl/types";

const PROVISION_SUBCOMMANDS: Array<{
  name: string;
  phase: LifecyclePhase;
  description: string;
}> = [
  {
    name: "system",
    phase: "provision-system",
    description: "Install system packages (apt, nodejs, tailscale, systemd-linger)",
  },
  {
    name: "tools",
    phase: "provision-tools",
    description: "Install user tools (homebrew, 1password-cli, shell profile)",
  },
  {
    name: "openclaw",
    phase: "provision-openclaw",
    description: "Install OpenClaw and configure gateway",
  },
  {
    name: "workspace",
    phase: "provision-workspace",
    description: "Install workspace skills and agent configuration",
  },
];

export function registerProvisionCommand(program: Command): void {
  const provision = program.command("provision").description("Provision the VM environment");

  for (const sub of PROVISION_SUBCOMMANDS) {
    provision
      .command(sub.name)
      .description(sub.description)
      .option("--json", "Output structured JSON")
      .action(async (opts: { json?: boolean }) => {
        if (opts.json) setJsonMode(true);
        const config = await readProvisionConfig();
        const ctx = createCapabilityContext();
        const hooks = getHooksForPhase(sub.phase, config);
        await runPhase(hooks, ctx, sub.phase, ok, fail);
      });
  }
}
