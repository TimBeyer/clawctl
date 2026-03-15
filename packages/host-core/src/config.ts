import { readFile } from "fs/promises";
import { resolveEnvRefs, validateConfig } from "@clawctl/types";
import type { InstanceConfig } from "@clawctl/types";

// Re-export pure functions for convenience
export { validateConfig, configToVMConfig, sanitizeConfig, formatZodError, expandTilde } from "@clawctl/types";

/** Read and validate a JSON config file. */
export async function loadConfig(path: string): Promise<InstanceConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (cause) {
    throw new Error(`Cannot read config file: ${path}`, { cause });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in config file: ${path}`);
  }

  // Resolve env:// references from host environment before validation
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    parsed = resolveEnvRefs(parsed as Record<string, unknown>);
  }

  return validateConfig(parsed);
}
