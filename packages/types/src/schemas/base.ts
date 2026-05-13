/**
 * Zod schemas for stable config sections: resources, network,
 * agent, tools, mounts.
 */
import { z } from "zod";

export const resourcesSchema = z.object({
  cpus: z.number().int().min(1, "'resources.cpus' must be a positive number").optional(),
  memory: z.string().optional(),
  disk: z.string().optional(),
});

export const networkSchema = z.object({
  forwardGateway: z.boolean().optional(),
  gatewayPort: z.number().int().min(1024).max(65535).optional(),
  gatewayToken: z.string().min(1).optional(),
});

export const agentSchema = z.object({
  skipOnboarding: z.boolean().optional(),
  toolsProfile: z.string().optional(),
  sandbox: z.boolean().optional(),
  elevated: z
    .object({
      allowFrom: z.record(z.string(), z.array(z.union([z.string(), z.number()]))).optional(),
    })
    .optional(),
});

export const toolsSchema = z.record(
  z.string(),
  z.union([z.boolean(), z.record(z.string(), z.unknown())]),
);

export const mountsSchema = z.array(
  z.object({
    location: z.string().min(1, "'mounts[].location' must be a non-empty string"),
    mountPoint: z.string().min(1, "'mounts[].mountPoint' must be a non-empty string"),
    writable: z.boolean().optional(),
  }),
);
