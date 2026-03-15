import { homedir } from "os";
import { resolve } from "path";
import { z } from "zod";
import { instanceConfigSchema } from "./schemas/index.js";
import { findSecretRefs } from "./secrets.js";
import type { InstanceConfig } from "./types.js";

/** Format a zod error into a readable message with field path. */
function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join(".");

  // Use custom messages (from .min() / .refine()) when they look specific
  if (issue.message && !issue.message.startsWith("Invalid input:")) {
    return issue.message;
  }

  // Build a path-based message for generic zod errors
  if (path) {
    return `'${path}': ${issue.message}`;
  }
  return issue.message;
}

/** Validate raw JSON and return a typed InstanceConfig. */
export function validateConfig(raw: unknown): InstanceConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Config must be a JSON object");
  }

  const result = instanceConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }

  const config = result.data;

  // Cross-validate: op:// references require services.onePassword
  const opRefs = findSecretRefs(raw as Record<string, unknown>).filter((r) => r.scheme === "op");
  if (opRefs.length > 0 && !config.services?.onePassword) {
    throw new Error(
      `Config has op:// references (${opRefs[0].path.join(".")}) but services.onePassword is not configured`,
    );
  }

  return {
    ...config,
    project: expandTilde(config.project),
  } as InstanceConfig;
}

/** Expand leading ~ to the user's home directory. */
function expandTilde(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    return resolve(homedir(), path.slice(2));
  }
  return path;
}
