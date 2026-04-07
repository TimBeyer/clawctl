/**
 * Composed instance config schema.
 *
 * Each section is defined in its own module and assembled here.
 */
import { z } from "zod";
import { resourcesSchema, networkSchema, agentSchema, toolsSchema, mountsSchema } from "./base.js";
import { providerSchema } from "./provider.js";
import { bootstrapSchema } from "./bootstrap.js";
import { channelsSchema, openclawSchema } from "./channels.js";

/** Schema for capability configs: true (enabled with defaults) or config object. */
export const capabilitiesSchema = z
  .record(z.string(), z.union([z.literal(true), z.record(z.string(), z.unknown())]))
  .optional();

export const instanceConfigSchema = z.object({
  name: z.string().min(1, "Config requires a non-empty 'name' string"),
  project: z.string().min(1, "Config requires a non-empty 'project' string"),
  resources: resourcesSchema.optional(),
  network: networkSchema.optional(),
  tools: toolsSchema.optional(),
  capabilities: capabilitiesSchema,
  mounts: mountsSchema.optional(),
  agent: agentSchema.optional(),
  provider: providerSchema.optional(),
  bootstrap: bootstrapSchema.optional(),
  channels: channelsSchema,
  openclaw: openclawSchema,
});

export { resourcesSchema, networkSchema, agentSchema, toolsSchema, mountsSchema };
export { providerSchema };
export { bootstrapSchema };
export { channelsSchema, openclawSchema };
