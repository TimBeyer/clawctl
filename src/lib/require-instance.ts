import type { RegistryEntry } from "./registry.js";
import { getInstance } from "./registry.js";
import { resolveInstance } from "./instance-context.js";
import { BIN_NAME } from "./bin-name.js";

export async function requireInstance(opts: { instance?: string }): Promise<RegistryEntry> {
  const { name } = await resolveInstance(opts.instance);
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    console.error(`Run '${BIN_NAME} list' to see registered instances.`);
    process.exit(1);
  }
  return entry;
}
