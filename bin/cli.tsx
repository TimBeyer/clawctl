#!/usr/bin/env bun

import { Command } from "commander";
import pkg from "../package.json";
import { LimaDriver } from "../src/drivers/index.js";
import { BIN_NAME } from "../src/lib/bin-name.js";
import {
  runCreateHeadless,
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
} from "../src/commands/index.js";

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
  .option("--config <path>", "Config file for headless mode")
  .action(async (opts: { config?: string }) => {
    try {
      if (opts.config) {
        await runCreateHeadless(driver, opts.config);
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
    await runStatus(driver, { instance: opts.instance ?? name });
  });

program
  .command("start [name]")
  .description("Start a stopped instance")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await runStart(driver, { instance: opts.instance ?? name });
  });

program
  .command("stop [name]")
  .description("Stop a running instance")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await runStop(driver, { instance: opts.instance ?? name });
  });

program
  .command("restart [name]")
  .description("Restart an instance with health checks")
  .option("-i, --instance <name>", "Instance to target")
  .action(async (name: string | undefined, opts: { instance?: string }) => {
    await runRestart(driver, { instance: opts.instance ?? name });
  });

program
  .command("delete [name]")
  .description("Delete an instance")
  .option("-i, --instance <name>", "Instance to target")
  .option("--purge", "Also remove the project directory")
  .action(async (name: string | undefined, opts: { instance?: string; purge?: boolean }) => {
    await runDelete(driver, { instance: opts.instance ?? name, purge: opts.purge });
  });

program
  .command("shell [name]")
  .description("Shell into an instance's VM (use -- to pass a command)")
  .option("-i, --instance <name>", "Instance to target")
  .passThroughOptions()
  .action(async (name: string | undefined, opts: { instance?: string }, command: Command) => {
    const args = command.args;
    await runShell(driver, { instance: opts.instance ?? name }, args.length > 0 ? args : undefined);
  });

program
  .command("register <name>")
  .description("Register an existing instance")
  .requiredOption("--project <path>", "Path to the project directory")
  .action(async (name: string, opts: { project: string }) => {
    await runRegister(driver, name, opts);
  });

program
  .command("openclaw")
  .alias("oc")
  .description("Run an openclaw command in the instance VM")
  .option("-i, --instance <name>", "Instance to target")
  .allowUnknownOption()
  .passThroughOptions()
  .action(async (opts: { instance?: string }, command: Command) => {
    await runOpenclaw(driver, opts, command.args);
  });

program
  .command("use [name]")
  .description("Set or show the current instance context")
  .option("--global", "Set global context instead of local .clawctl file")
  .action(async (name: string | undefined, opts: { global?: boolean }) => {
    await runUse(name, opts);
  });

await program.parseAsync();
