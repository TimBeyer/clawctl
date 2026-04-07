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

export interface ValidateConfigOptions {
  /** Strict Zod schema for the capabilities section (built from capability configDefs). */
  capabilitySchema?: z.ZodTypeAny;
  /** Strict Zod schema for the channels section (built from ChannelDef configDefs). */
  channelSchema?: z.ZodTypeAny;
}

/** Validate raw JSON and return a typed InstanceConfig. */
export function validateConfig(raw: unknown, opts?: ValidateConfigOptions): InstanceConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Config must be a JSON object");
  }

  const result = instanceConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }

  const config = result.data;

  // Validate capability-specific config against strict schemas
  if (opts?.capabilitySchema && config.capabilities) {
    const capResult = opts.capabilitySchema.safeParse(config.capabilities);
    if (!capResult.success) {
      const issue = (capResult as { error: z.ZodError }).error.issues[0];
      const path = ["capabilities", ...issue.path].join(".");
      throw new Error(
        issue.message.startsWith("'") ? issue.message : `'${path}': ${issue.message}`,
      );
    }
  }

  // Validate channel-specific config against strict schemas
  if (opts?.channelSchema && config.channels) {
    const chResult = opts.channelSchema.safeParse(config.channels);
    if (!chResult.success) {
      const issue = (chResult as { error: z.ZodError }).error.issues[0];
      const path = ["channels", ...issue.path].join(".");
      throw new Error(
        issue.message.startsWith("'") ? issue.message : `'${path}': ${issue.message}`,
      );
    }
  }

  // Cross-validate: op:// references require capabilities["one-password"]
  const opRefs = findSecretRefs(raw as Record<string, unknown>).filter((r) => r.scheme === "op");
  if (opRefs.length > 0) {
    const hasOp = config.capabilities && "one-password" in config.capabilities;
    if (!hasOp) {
      throw new Error(
        `Config has op:// references (${opRefs[0].path.join(".")}) but capabilities["one-password"] is not configured`,
      );
    }
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
