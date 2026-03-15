import { Command } from "commander";
import { setJsonMode } from "../../output.js";
import { runStage } from "./stages.js";
import { systemStage } from "./system.js";
import { toolsStage } from "./tools.js";
import { openclawStage } from "./openclaw.js";
import { workspaceStage } from "./workspace.js";

export function registerProvisionCommand(program: Command): void {
  const provision = program.command("provision").description("Provision the VM environment");

  provision
    .command("system")
    .description("Install system packages (apt, nodejs, tailscale, systemd-linger)")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      await runStage(systemStage);
    });

  provision
    .command("tools")
    .description("Install user tools (homebrew, 1password-cli, shell profile)")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      await runStage(toolsStage);
    });

  provision
    .command("openclaw")
    .description("Install OpenClaw and configure gateway")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      await runStage(openclawStage);
    });

  provision
    .command("workspace")
    .description("Install workspace skills and agent configuration")
    .option("--json", "Output structured JSON")
    .action(async (opts: { json?: boolean }) => {
      if (opts.json) setJsonMode(true);
      await runStage(workspaceStage);
    });
}
