/**
 * Zod schema for the telegram config section.
 */
import { z } from "zod";

export const telegramSchema = z.object({
  botToken: z.string().min(1, "'telegram.botToken' must be a non-empty string"),
  allowFrom: z.array(z.string()).optional(),
  groups: z.record(z.string(), z.object({ requireMention: z.boolean().optional() })).optional(),
});
