/**
 * Composed instance config schema.
 *
 * Each section is defined in its own module and assembled here.
 */
import { z } from "zod";
import {
  resourcesSchema,
  networkSchema,
  servicesSchema,
  agentSchema,
  toolsSchema,
  mountsSchema,
} from "./base.js";
import { providerSchema } from "./provider.js";
import { telegramSchema } from "./telegram.js";
import { bootstrapSchema } from "./bootstrap.js";

export const instanceConfigSchema = z.object({
  name: z.string().min(1, "Config requires a non-empty 'name' string"),
  project: z.string().min(1, "Config requires a non-empty 'project' string"),
  resources: resourcesSchema.optional(),
  network: networkSchema.optional(),
  services: servicesSchema.optional(),
  tools: toolsSchema.optional(),
  mounts: mountsSchema.optional(),
  agent: agentSchema.optional(),
  provider: providerSchema.optional(),
  bootstrap: bootstrapSchema.optional(),
  telegram: telegramSchema.optional(),
});

export { resourcesSchema, networkSchema, servicesSchema, agentSchema, toolsSchema, mountsSchema };
export { providerSchema };
export { bootstrapSchema };
export { telegramSchema };
