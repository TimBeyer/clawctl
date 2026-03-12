# Config Reference

Configuration file reference for `clawctl create --config <path>`. Only `name`
and `project` are required. Everything else is optional and has sensible defaults.

## Examples

**Minimal config:**

```json
{
  "name": "my-agent",
  "project": "~/openclaw-vms/my-agent"
}
```

**Minimal bootstrap** (VM + working openclaw):

```json
{
  "name": "my-agent",
  "project": "~/openclaw-vms/my-agent",
  "provider": {
    "type": "anthropic",
    "apiKey": "sk-ant-..."
  }
}
```

**Full config with all options:**

```json
{
  "name": "hal",
  "project": "~/openclaw-vms/hal",
  "resources": {
    "cpus": 4,
    "memory": "8GiB",
    "disk": "50GiB"
  },
  "network": {
    "forwardGateway": true,
    "gatewayPort": 18789,
    "gatewayToken": "my-secret-token",
    "tailscale": {
      "authKey": "tskey-auth-...",
      "mode": "serve"
    }
  },
  "services": {
    "onePassword": {
      "serviceAccountToken": "ops_..."
    }
  },
  "provider": {
    "type": "anthropic",
    "apiKey": "sk-ant-...",
    "model": "anthropic/claude-opus-4-6"
  },
  "agent": {
    "toolsProfile": "full",
    "sandbox": false
  },
  "telegram": {
    "botToken": "123456:ABC-...",
    "allowFrom": ["123456789"],
    "groups": {
      "-100123456789": { "requireMention": true }
    }
  }
}
```

**Custom provider** (self-hosted or OpenAI-compatible):

```json
{
  "name": "my-agent",
  "project": "~/openclaw-vms/my-agent",
  "provider": {
    "type": "custom",
    "baseUrl": "http://localhost:11434/v1",
    "modelId": "llama3",
    "compatibility": "openai"
  }
}
```

## Top-level fields

| Field     | Type   | Required | Default | Description                                                                                         |
| --------- | ------ | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `name`    | string | Yes      | —       | Instance name. Becomes the Lima VM name.                                                            |
| `project` | string | Yes      | —       | Host directory for generated files, config, and agent state. `~` is expanded to the home directory. |

## `resources`

VM resource allocation. Omit the entire section to use defaults.

| Field    | Type   | Default   | Description                                             |
| -------- | ------ | --------- | ------------------------------------------------------- |
| `cpus`   | number | `4`       | Number of virtual CPUs.                                 |
| `memory` | string | `"8GiB"`  | RAM allocation (Lima format, e.g. `"4GiB"`, `"16GiB"`). |
| `disk`   | string | `"50GiB"` | Disk size (Lima format).                                |

## `network`

Network and connectivity settings.

| Field               | Type    | Default   | Description                                                                                                                                       |
| ------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forwardGateway`    | boolean | `true`    | Forward the gateway port from guest to host. Set `false` if using Tailscale only — the gateway is reachable over the tailnet.                     |
| `gatewayPort`       | number  | `18789`   | Host-side port for the gateway forward. Must be 1024–65535.                                                                                       |
| `gatewayToken`      | string  | —         | Gateway auth token. Auto-generated if not set.                                                                                                    |
| `tailscale`         | object  | —         | If present, connects the VM to your Tailscale network non-interactively.                                                                          |
| `tailscale.authKey` | string  | —         | Tailscale auth key (`tskey-auth-...`). Generate one at [Tailscale Admin → Keys](https://login.tailscale.com/admin/settings/keys).                 |
| `tailscale.mode`    | string  | `"serve"` | Gateway mode: `"serve"` (HTTPS on tailnet), `"funnel"` (public HTTPS), or `"off"`. See [Tailscale Setup](tailscale-setup.md#gateway-integration). |

## `services`

External service integrations. Presence of a section means "configure this service."

| Field                             | Type   | Description                                                                                                                            |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `onePassword`                     | object | If present, validates and persists a 1Password service account token in the VM. Enables `op://` reference resolution.                  |
| `onePassword.serviceAccountToken` | string | 1Password service account token (`ops_...`) or `env://VAR_NAME` reference. Stored at `~/.openclaw/credentials/op-token` inside the VM. |

## `tools`

Additional tools to install. **Not yet wired up** — the type is defined for
forward compatibility. Currently accepted but ignored.

```json
"tools": { "docker": true, "python": true }
```

## `mounts`

Extra host directories to mount read-only into the VM. **Not yet wired up** —
the type is defined for forward compatibility. Currently accepted but ignored.

```json
"mounts": ["~/.ssh", "~/.gitconfig"]
```

## `provider`

Model provider configuration. When present, headless mode runs
`openclaw onboard --non-interactive` to fully bootstrap the instance — daemon
running, model configured, dashboard accessible.

| Field           | Type   | Default    | Description                                                                                       |
| --------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------- |
| `type`          | string | (required) | Provider name (see table below) or `"custom"` for self-hosted.                                    |
| `apiKey`        | string | (required) | API key or `op://` reference. Required for all providers except `"custom"` (where it's optional). |
| `model`         | string | —          | Model identifier (e.g. `"anthropic/claude-opus-4-6"`). Omit to use openclaw's default.            |
| `baseUrl`       | string | —          | Base URL (required for `"custom"` providers).                                                     |
| `modelId`       | string | —          | Model ID (required for `"custom"` providers).                                                     |
| `compatibility` | string | —          | API compatibility mode for custom providers (`"openai"` or `"anthropic"`).                        |
| `providerId`    | string | —          | Custom provider identifier.                                                                       |

**Supported provider types:**

`anthropic`, `openai`, `gemini`, `zai`, `mistral`, `moonshot`, `synthetic`,
`opencode-zen`, `ai-gateway`, `kilocode`, `volcengine`, `byteplus`, `minimax`,
`huggingface`, `custom`

Use `"custom"` with `baseUrl` + `modelId` for self-hosted endpoints (ollama,
vLLM, LM Studio) or any OpenAI/Anthropic-compatible API (openrouter, xai,
groq, cerebras, etc.).

## `agent`

Agent behavior configuration. Applied during bootstrap (when `provider` is present).

| Field            | Type    | Default  | Description                                                                                              |
| ---------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `skipOnboarding` | boolean | `true`   | Skip `openclaw onboard` in headless mode. Set `false` to run onboarding (requires interactive terminal). |
| `toolsProfile`   | string  | `"full"` | Agent tools profile (`"full"`, `"coding"`, `"messaging"`, etc.).                                         |
| `sandbox`        | boolean | —        | Set to `false` to disable sandbox mode (`agents.defaults.sandbox.mode off`).                             |

## `telegram`

Telegram channel configuration (optional). Applied during bootstrap after onboarding.

| Field                        | Type     | Description                                      |
| ---------------------------- | -------- | ------------------------------------------------ |
| `botToken`                   | string   | Bot token from BotFather (required).             |
| `allowFrom`                  | string[] | Telegram user IDs allowed to DM the bot.         |
| `groups`                     | object   | Group IDs and their settings.                    |
| `groups.<id>.requireMention` | boolean  | Whether the bot requires @mention in this group. |

## Secret references

String values in the config can use URI references instead of plaintext secrets:

- **`env://VAR_NAME`** — resolved from the host environment at config-load time. Bun auto-loads `.env` files.
- **`op://vault/item/field`** — resolved inside the VM via `op read` after 1Password setup. Requires `services.onePassword`.

This means configs with `op://` and `env://` references contain zero plaintext
secrets and can be safely committed to git. See
[1Password Setup](1password-setup.md#secret-references-in-config-files) for details.

## Example config files

- [`config.json`](../examples/config.json) — minimal (name + project only)
- [`config.bootstrap.json`](../examples/config.bootstrap.json) — minimal working openclaw (name + project + API key)
- [`config.full.json`](../examples/config.full.json) — all options including provider + telegram
- [`config.op.json`](../examples/config.op.json) — zero-plaintext secrets using `op://` and `env://` references
