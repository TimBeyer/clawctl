import {
  getInstance,
  writeLocalContext,
  writeGlobalContext,
  resolveInstance,
} from "@clawctl/host-core";
import { BIN_NAME } from "@clawctl/host-core";

const SOURCE_LABELS: Record<string, string> = {
  flag: "--instance flag",
  env: "CLAWCTL_INSTANCE env var",
  local: ".clawctl file",
  global: "global context (~/.config/clawctl/context.json)",
};

export async function runUse(name?: string, opts: { global?: boolean } = {}): Promise<void> {
  // No name → show current context
  if (!name) {
    try {
      const resolved = await resolveInstance();
      console.log(`${resolved.name}  (from ${SOURCE_LABELS[resolved.source] ?? resolved.source})`);
    } catch {
      console.log("No instance context set.");
      console.log(`Run '${BIN_NAME} use <name>' to set one.`);
    }
    return;
  }

  // Validate instance exists
  const entry = await getInstance(name);
  if (!entry) {
    console.error(`Instance "${name}" not found in registry.`);
    console.error(`Run '${BIN_NAME} list' to see registered instances.`);
    process.exit(1);
  }

  if (opts.global) {
    await writeGlobalContext(name);
    console.log(`Global context set to "${name}".`);
  } else {
    await writeLocalContext(name);
    console.log(`Local context set to "${name}" (.clawctl written in current directory).`);
  }
}
