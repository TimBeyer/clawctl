#!/usr/bin/env bun

import { Command } from "commander";
import { registerProvisionCommand } from "../src/commands/provision/index.js";
import { registerDoctorCommand } from "../src/commands/doctor.js";
import { registerCheckpointCommand } from "../src/commands/checkpoint.js";

const program = new Command()
  .name("claw")
  .description("VM-side CLI for OpenClaw gateway management")
  .version("0.1.0");

registerProvisionCommand(program);
registerDoctorCommand(program);
registerCheckpointCommand(program);

(async () => {
  await program.parseAsync();
})();
