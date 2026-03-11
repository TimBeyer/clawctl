/**
 * Zod schema for the provider config section.
 *
 * Validates against the provider registry — rejects unknown types and
 * enforces custom provider constraints (baseUrl + modelId required).
 */
import { z } from "zod";
import { ALL_PROVIDER_TYPES } from "../providers.js";

export const providerSchema = z
  .object({
    /** Provider type (e.g. "anthropic", "openai", "gemini", "custom"). */
    type: z.string().min(1, "'provider.type' is required"),
    /** API key. Required for all providers except custom (where it's optional). */
    apiKey: z.string().min(1).optional(),
    /** Model identifier override. */
    model: z.string().optional(),
    /** Base URL (required for custom providers). */
    baseUrl: z.string().optional(),
    /** Model ID (required for custom providers). */
    modelId: z.string().optional(),
    /** API compatibility mode for custom providers (e.g. "openai", "anthropic"). */
    compatibility: z.string().optional(),
    /** Provider ID for custom providers. */
    providerId: z.string().optional(),
  })
  .refine((p) => ALL_PROVIDER_TYPES.includes(p.type), {
    message: `'provider.type' must be one of: ${ALL_PROVIDER_TYPES.join(", ")}`,
    path: ["type"],
  })
  .refine((p) => p.type === "custom" || (p.apiKey && p.apiKey.length > 0), {
    message: "'provider.apiKey' is required for non-custom providers",
    path: ["apiKey"],
  })
  .refine((p) => p.type !== "custom" || (p.baseUrl && p.baseUrl.length > 0), {
    message: "'provider.baseUrl' is required for custom providers",
    path: ["baseUrl"],
  })
  .refine((p) => p.type !== "custom" || (p.modelId && p.modelId.length > 0), {
    message: "'provider.modelId' is required for custom providers",
    path: ["modelId"],
  });
