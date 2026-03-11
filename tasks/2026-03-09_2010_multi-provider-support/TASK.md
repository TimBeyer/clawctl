# Multi-provider support + config module restructure

## Status: Resolved

## Scope

Support all model providers from docs.openclaw.ai/concepts/model-providers.
Restructure the config module so it stays clean as the schema grows.

Covers:

- Provider registry with all onboard-supported providers
- Custom provider support (base URL, model ID, compatibility)
- Composable zod schemas split by concern
- Thin config.ts that assembles from parts
- Updated bootstrap.ts that builds the right onboard command per provider

Does NOT cover:

- OAuth-based providers (google-vertex, github-copilot, openai-codex,
  qwen-portal, google-antigravity, google-gemini-cli) — these require
  interactive auth flows that can't be automated via onboard
- Cloudflare AI Gateway (needs account-id + gateway-id, not just an API key —
  different shape, can add later)

## Plan

1. Create provider registry + schema — commit
2. Extract composable schemas into `src/lib/schemas/` — commit
3. Simplify config.ts to use composed schema — commit
4. Update bootstrap.ts to use provider registry — commit
5. Update types, tests, examples, docs — commit

## Architecture

```
src/lib/
  providers.ts           — Provider registry + onboard arg builder
  schemas/
    index.ts             — Composes instanceConfigSchema from parts
    provider.ts          — Provider section schema (imports provider types)
    telegram.ts          — Telegram section schema
    base.ts              — Resources, network, services, agent schemas
  config.ts              — loadConfig, validateConfig (thin — uses schemas/)
  bootstrap.ts           — Orchestration (uses providers.ts)
```

### Provider config shape

```json
{
  "provider": {
    "type": "anthropic",
    "apiKey": "sk-ant-..."
  }
}
```

For custom/self-hosted:

```json
{
  "provider": {
    "type": "custom",
    "baseUrl": "https://llm.example.com/v1",
    "modelId": "foo-large",
    "apiKey": "...",
    "compatibility": "openai"
  }
}
```

### Provider registry

Each entry maps a type to its onboard flags:

```typescript
interface ProviderDef {
  authChoice: string; // --auth-choice value
  envVar: string; // env var to pass the API key
  keyFlag: string; // --{flag} for the key
}
```

### Why `type` instead of `authChoice`

The previous `authChoice` exposed openclaw's internal flag naming. `type` is
user-facing and stable — the registry maps it to the right flags internally.

## Steps

- [x] Create `src/lib/providers.ts` with registry + `buildOnboardCommand()`
- [x] Create `src/lib/schemas/base.ts`
- [x] Create `src/lib/schemas/telegram.ts`
- [x] Create `src/lib/schemas/provider.ts`
- [x] Create `src/lib/schemas/index.ts`
- [x] Simplify `src/lib/config.ts`
- [x] Update `src/types.ts` (provider shape: type replaces authChoice)
- [x] Update `src/lib/bootstrap.ts` to use providers.ts
- [x] Update tests
- [x] Update example configs + docs

## Notes

### Providers supported via `openclaw onboard --non-interactive`

First-class (dedicated --auth-choice):
anthropic, openai, gemini, zai, mistral, moonshot, synthetic, opencode-zen,
ai-gateway, kilocode, volcengine, byteplus, minimax, huggingface

Via custom route (--auth-choice custom-api-key + --custom-base-url etc.):
openrouter, xai, groq, cerebras, ollama, vllm, lmstudio, and any
OpenAI/Anthropic-compatible endpoint

Not automatable (OAuth/interactive):
google-vertex, github-copilot, openai-codex, qwen-portal,
google-antigravity, google-gemini-cli

### Custom providers need baseUrl + modelId

The `--auth-choice custom-api-key` route requires `--custom-base-url` and
`--custom-model-id`. The API key is optional (local providers like ollama
don't need one). Validated via zod `.refine()`.

## Outcome

Delivered:

- **Provider registry** (`providers.ts`): 14 first-class providers (anthropic,
  openai, gemini, zai, mistral, moonshot, synthetic, opencode-zen, ai-gateway,
  kilocode, volcengine, byteplus, minimax, huggingface) + custom provider route
- **Composable schemas** (`schemas/`): base, provider, telegram each in their
  own module, assembled in index.ts. config.ts is now a thin loader.
- **`buildOnboardCommand()`**: maps any provider config to the correct
  `openclaw onboard --non-interactive` command with the right env var, flags,
  and auth-choice
- **Custom provider support**: type "custom" + baseUrl + modelId for
  ollama, vLLM, LM Studio, openrouter, xai, groq, cerebras, or any
  OpenAI/Anthropic-compatible endpoint
- 140 tests pass, lint + format clean

Deferred:

- OAuth providers (google-vertex, github-copilot, etc.) — not automatable
- Cloudflare AI Gateway — different shape (account-id + gateway-id)
