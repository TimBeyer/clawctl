#!/usr/bin/env bun

import { Command } from "commander";
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
} from "../src/commands/index.js";

const driver = new LimaDriver();

const program = new Command()
  .name(BIN_NAME)
  .description("Full-lifecycle management tool for OpenClaw instances")
  .version("0.1.0")
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
  .command("status <name>")
  .description("Show detailed info for an instance")
  .action(async (name: string) => {
    await runStatus(driver, name);
  });

program
  .command("start <name>")
  .description("Start a stopped instance")
  .action(async (name: string) => {
    await runStart(driver, name);
  });

program
  .command("stop <name>")
  .description("Stop a running instance")
  .action(async (name: string) => {
    await runStop(driver, name);
  });

program
  .command("restart <name>")
  .description("Restart an instance with health checks")
  .action(async (name: string) => {
    await runRestart(driver, name);
  });

program
  .command("delete <name>")
  .description("Delete an instance")
  .option("--purge", "Also remove the project directory")
  .action(async (name: string, opts: { purge?: boolean }) => {
    await runDelete(driver, name, opts);
  });

program
  .command("shell <name>")
  .description("Shell into an instance's VM")
  .action(async (name: string) => {
    await runShell(driver, name);
  });

program
  .command("register <name>")
  .description("Register an existing instance")
  .requiredOption("--project <path>", "Path to the project directory")
  .action(async (name: string, opts: { project: string }) => {
    await runRegister(driver, name, opts);
  });

await program.parseAsync();
