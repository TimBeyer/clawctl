/**
 * Zod schema for the bootstrap config section.
 *
 * Accepts either a raw prompt string or a structured object with agent/user
 * identity data that gets turned into a prompt by the template.
 */
import { z } from "zod";

const bootstrapAgentSchema = z.object({
  name: z.string().min(1, "'bootstrap.agent.name' must be a non-empty string"),
  context: z.string().optional(),
});

const bootstrapUserSchema = z.object({
  name: z.string().min(1, "'bootstrap.user.name' must be a non-empty string"),
  context: z.string().optional(),
});

export const bootstrapSchema = z.union([
  z.string().min(1, "'bootstrap' string must be non-empty"),
  z.object({
    agent: bootstrapAgentSchema,
    user: bootstrapUserSchema.optional(),
  }),
]);
