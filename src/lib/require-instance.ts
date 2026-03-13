import type { RegistryEntry } from "./registry.js";
import { getInstance } from "./registry.js";
import { resolveInstance } from "./instance-context.js";
import { BIN_NAME } from "./bin-name.js";

export async function requireInstance(opts: { instance?: string }): Promise<RegistryEntry> {
  let name: string;
  try {
    ({ name } = await resolveInstance(opts.instance));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    console.error(`Run '${BIN_NAME} list' to see registered instances.`);
    process.exit(1);
  }
  return entry;
}
