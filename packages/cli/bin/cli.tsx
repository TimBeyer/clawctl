#!/usr/bin/env bun

import { Command } from "commander";
import pkg from "../../../package.json";
import { LimaDriver, BIN_NAME } from "@clawctl/host-core";
import {
  runCreateFromConfig,
  runCreatePlain,
  runCreateWizard,
  runList,
  runStatus,
  runStart,
  runStop,
  runRestart,
  runDelete,
  runShell,
  runRegister,
  runOpenclaw,
  runUse,
  runCompletions,
  runCompletionsUpdateOc,
  runDaemonStart,
  runDaemonStop,
  runDaemonRestart,
  runDaemonStatus,
  runDaemonLogs,
  runDaemonRun,
  runUpdate,
  runMountList,
  runMountAdd,
  runMountRemove,
} from "../src/commands/index.js";
import { ensureDaemon } from "@clawctl/daemon";
import { checkAndPromptUpdate } from "../src/update-hook.js";

const driver = new LimaDriver();

const program = new Command()
  .name(BIN_NAME)
  .description("Full-lifecycle management tool for OpenClaw instances")
  .version(pkg.version)
  .enablePositionalOptions()
  .action(() => {
    program.help();
  });

program
  .command("create")
  .description("Create a new OpenClaw instance")
  .option("--config <path>", "Config file (skips wizard, shows TUI progress)")
  .option("--plain", "Plain log output instead of TUI (for CI/automation)")
  .action(async (opts: { config?: string; plain?: boolean }) => {
    try {
      if (opts.config && opts.plain) {
        await runCreatePlain(driver, opts.config);
      } else if (opts.config) {
        await runCreateFromConfig(driver, opts.config);
      } else {
        await runCreateWizard(driver);
      }
    } catch (err) {
      console.error(err instanceof Error ? `Error: ${err.message}` : err);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all instances with live status")
  .action(async () => {
    await runList(driver);
  });

program
  .command("status [name]")
  .description("Show detailed info for an instance")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await ensureDaemon();
    await runStatus(driver, { instance: opts.instance ?? name });
  });

program
  .command("start [name]")
  .description("Start a stopped instance")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await ensureDaemon();
    await runStart(driver, { instance: opts.instance ?? name });
  });

program
  .command("stop [name]")
  .description("Stop a running instance")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await ensureDaemon();
    await runStop(driver, { instance: opts.instance ?? name });
  });

program
  .command("restart [name]")
  .description("Restart an instance with health checks")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await ensureDaemon();
    await runRestart(driver, { instance: opts.instance ?? name });
  });

program
  .command("delete [name]")
  .description("Delete an instance")
  .option("-i, --instance <name>", "Instance to target")
  .option("--purge", "Also remove the project directory")
  .action(async (name: string | undefined, opts: { instance?: string; purge?: boolean }) => {
    await ensureDaemon();
    await runDelete(driver, { instance: opts.instance ?? name, purge: opts.purge });
  });

program
  .command("shell [name]")
  .description("Shell into an instance's VM (use -- to pass a command)")
  .option("-i, --instance <name>", "Instance to target")
  .allowExcessArguments(true)
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    // Commander mixes positionals after -- into the declared args.
    // Find -- in process.argv and take everything after it as the command.
    const ddIndex = process.argv.indexOf("--");
    const passedArgs = ddIndex !== -1 ? process.argv.slice(ddIndex + 1) : undefined;
    // If -- was used, name may have been filled from args after -- rather than
    // before it (e.g. `shell -- ls` sets name="ls"). Check whether name
    // actually appeared before the -- separator.
    let instanceName = name;
    if (ddIndex !== -1 && name !== undefined) {
      const beforeDd = process.argv.slice(0, ddIndex);
      if (!beforeDd.includes(name)) {
        instanceName = undefined;
      }
    }
    await ensureDaemon();
    await runShell(
      driver,
      { instance: opts.instance ?? instanceName },
      passedArgs && passedArgs.length > 0 ? passedArgs : undefined,
    );
  });

program
  .command("register <name>")
  .description("Register an existing instance")
  .requiredOption("--project <path>", "Path to the project directory")
  .action(async (name: string, opts: { project: string }) => {
    await runRegister(driver, name, opts);
  });

program
  .command("openclaw [args...]")
  .alias("oc")
  .description("Run an openclaw command in the instance VM")
  .option("-i, --instance <name>", "Instance to target")
  .allowUnknownOption()
  .passThroughOptions()
  .action(async (args: string[], opts: { instance?: string }) => {
    await ensureDaemon();
    await runOpenclaw(driver, opts, args);
  });

program
  .command("use [name]")
  .description("Set or show the current instance context")
  .option("--global", "Set global context instead of local .clawctl file")
  .action(async (name: string | undefined, opts: { global?: boolean }) => {
    await runUse(name, opts);
  });

const mountCmd = program
  .command("mount")
  .description("Manage VM mount points")
  .action(() => {
    mountCmd.help();
  });

mountCmd
  .command("list [name]")
  .description("List all mounts for an instance")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await runMountList(driver, { instance: opts.instance ?? name });
  });

mountCmd
  .command("add [name]")
  .description("Add a host directory mount to the VM")
  .argument("<host-path>", "Host directory to mount")
  .argument("<guest-path>", "Mount point inside the VM")
  .option("-i, --instance <name>", "Instance to target")
  .option("--writable", "Mount as read-write (default: read-only)")
  .option("--no-restart", "Update config but don't restart the VM")
  .showHelpAfterError(true)
  .action(
    async (
      name: string | undefined,
      hostPath: string,
      guestPath: string,
      opts: { instance?: string; writable?: boolean; noRestart?: boolean },
    ) => {
      await runMountAdd(driver, { instance: opts.instance ?? name, ...opts }, hostPath, guestPath);
    },
  );

mountCmd
  .command("remove [name]")
  .description("Remove a mount from the VM")
  .argument("<guest-path>", "Mount point to remove")
  .option("-i, --instance <name>", "Instance to target")
  .option("--no-restart", "Update config but don't restart the VM")
  .showHelpAfterError(true)
  .action(
    async (
      name: string | undefined,
      guestPath: string,
      opts: { instance?: string; noRestart?: boolean },
    ) => {
      await runMountRemove(driver, { instance: opts.instance ?? name, ...opts }, guestPath);
    },
  );

const daemonCmd = program.command("daemon").description("Manage the background daemon");

daemonCmd
  .command("start")
  .description("Start the background daemon")
  .action(async () => {
    await runDaemonStart();
  });

daemonCmd
  .command("stop")
  .description("Stop the running daemon")
  .action(async () => {
    await runDaemonStop();
  });

daemonCmd
  .command("restart")
  .description("Stop and restart the daemon")
  .action(async () => {
    await runDaemonRestart();
  });

daemonCmd
  .command("status")
  .description("Show daemon status, watched instances, and task states")
  .action(async () => {
    await runDaemonStatus();
  });

daemonCmd
  .command("logs")
  .description("Show recent daemon log lines")
  .option("-f, --follow", "Tail logs (follow mode)")
  .option("-n, --lines <count>", "Number of lines to show", "50")
  .action(async (opts: { follow?: boolean; lines?: string }) => {
    await runDaemonLogs({ follow: opts.follow, lines: parseInt(opts.lines ?? "50", 10) });
  });

daemonCmd
  .command("run", { hidden: true })
  .description("Run daemon in foreground (internal)")
  .action(async () => {
    await runDaemonRun();
  });

const completionsCmd = program.command("completions").description("Shell completion scripts");

completionsCmd
  .command("bash")
  .description("Generate bash completion script")
  .action(async () => {
    await runCompletions("bash");
  });

completionsCmd
  .command("zsh")
  .description("Generate zsh completion script")
  .action(async () => {
    await runCompletions("zsh");
  });

completionsCmd
  .command("update-oc")
  .description("Cache openclaw completions from a running instance")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (opts: { instance?: string }) => {
    await runCompletionsUpdateOc(driver, opts);
  });

program
  .command("update")
  .description("Check for and apply clawctl updates")
  .option("--apply-vm", "Apply VM updates after binary replacement (internal)")
  .action(async (opts: { applyVm?: boolean }) => {
    try {
      await runUpdate(opts);
    } catch (err) {
      console.error(err instanceof Error ? `Error: ${err.message}` : err);
      process.exit(1);
    }
  });

// Pre-command update check (skip for commands that handle updates themselves or are non-interactive)
const SKIP_UPDATE_COMMANDS = new Set(["update", "daemon", "completions"]);

program.hook("preAction", async (_thisCommand, actionCommand) => {
  // Walk up to find the top-level subcommand name
  let cmd = actionCommand;
  while (cmd.parent && cmd.parent !== program) {
    cmd = cmd.parent;
  }
  const commandName = cmd.name();
  if (SKIP_UPDATE_COMMANDS.has(commandName)) return;

  try {
    const result = await checkAndPromptUpdate(pkg.version);
    if (result === "updated") process.exit(0);
  } catch (err) {
    // Update check/apply failed — don't block the user's command
    console.error(`Warning: update check failed: ${err instanceof Error ? err.message : err}`);
  }
});

await program.parseAsync();
