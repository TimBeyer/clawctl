import { resolve } from "path";
import type { VMDriver } from "@clawctl/host-core";
import { addInstance, getInstance } from "@clawctl/host-core";
import { GATEWAY_PORT } from "@clawctl/types";

export async function runRegister(
  driver: VMDriver,
  name: string,
  opts: { project: string },
): Promise<void> {
  // Check if already registered
  const existing = await getInstance(name);
  if (existing) {
    console.error(`Instance "${name}" is already registered.`);
    process.exit(1);
  }

  // Verify VM exists
  if (!(await driver.exists(name))) {
    console.error(`VM "${name}" not found. Make sure the VM exists before registering.`);
    process.exit(1);
  }

  const projectDir = resolve(opts.project);

  await addInstance({
    name,
    projectDir,
    vmName: name,
    driver: driver.name,
    createdAt: new Date().toISOString(),
    gatewayPort: GATEWAY_PORT,
  });

  console.log(`Registered instance "${name}".`);
  console.log(`  Project: ${projectDir}`);
  console.log(`  VM:      ${name}`);
}
