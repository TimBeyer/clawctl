import { homedir } from "os";
import { resolve } from "path";
import { z } from "zod";
import { instanceConfigSchema } from "./schemas/index.js";
import { findSecretRefs } from "./secrets.js";
import type { InstanceConfig, VMConfig } from "./types.js";

/** Format a zod error into a readable message with field path. */
export function formatZodError(error: z.ZodError): string {
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

/** Convert InstanceConfig → VMConfig with defaults applied. */
export function configToVMConfig(config: InstanceConfig): VMConfig {
  const vm: VMConfig = {
    vmName: config.name,
    projectDir: config.project,
    cpus: config.resources?.cpus ?? 4,
    memory: config.resources?.memory ?? "8GiB",
    disk: config.resources?.disk ?? "50GiB",
  };
  if (config.mounts && config.mounts.length > 0) {
    vm.extraMounts = config.mounts;
  }
  return vm;
}

/** Strip secrets and one-time fields from config for persistence as clawctl.json. */
export function sanitizeConfig(config: InstanceConfig): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

  // provider.apiKey
  if (clone.provider && typeof clone.provider === "object") {
    delete (clone.provider as Record<string, unknown>).apiKey;
  }

  // network.gatewayToken, network.tailscale.authKey
  if (clone.network && typeof clone.network === "object") {
    const net = clone.network as Record<string, unknown>;
    delete net.gatewayToken;
    if (net.tailscale && typeof net.tailscale === "object") {
      delete (net.tailscale as Record<string, unknown>).authKey;
    }
  }

  // services.onePassword.serviceAccountToken
  if (clone.services && typeof clone.services === "object") {
    const svc = clone.services as Record<string, unknown>;
    if (svc.onePassword && typeof svc.onePassword === "object") {
      delete (svc.onePassword as Record<string, unknown>).serviceAccountToken;
    }
  }

  // telegram.botToken
  if (clone.telegram && typeof clone.telegram === "object") {
    delete (clone.telegram as Record<string, unknown>).botToken;
  }

  // bootstrap (one-time action)
  delete clone.bootstrap;

  return clone;
}

/** Expand leading ~ to the user's home directory. */
export function expandTilde(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    return resolve(homedir(), path.slice(2));
  }
  return path;
}
