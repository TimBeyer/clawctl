import { Command } from "commander";
import { setJsonMode } from "../../output.js";
import { runProvisionSystem } from "./system.js";
import { runProvisionTools } from "./tools.js";
import { runProvisionOpenclaw } from "./openclaw.js";

export function registerProvisionCommand(program: Command): void {
  const provision = program
    .command("provision")
    .description("Provision the VM environment");

  provision
    .command("system")
    .description("Install system packages (apt, nodejs, tailscale, systemd-linger)")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      await runProvisionSystem();
    });

  provision
    .command("tools")
    .description("Install user tools (homebrew, 1password-cli, shell profile)")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      await runProvisionTools();
    });

  provision
    .command("openclaw")
    .description("Install OpenClaw and configure gateway")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      await runProvisionOpenclaw();
    });
}
