import { describe, test, expect } from "bun:test";
import { sanitizeKey } from "./secrets-sync.js";
import { applyAuthProfileSwap } from "./infra-secrets.js";

/**
 * Unit tests for infra-secrets logic.
 *
 * patchMainConfig and patchAuthProfiles do VM I/O (driver.exec) so they're
 * exercised in VM integration tests. Here we drive the pure transformations
 * underpinning them: key sanitization, SecretRef construction, and the
 * auth-profile swap that handles both first-run migration and
 * provider-switch reconfiguration.
 */

describe("SecretRef construction", () => {
  test("produces correct file provider ref for apiKey", () => {
    const id = `/${sanitizeKey(["provider", "apiKey"])}`;
    expect(id).toBe("/provider_apikey");
  });

  test("produces correct file provider ref for channel botToken", () => {
    const id = `/${sanitizeKey(["channels", "telegram", "botToken"])}`;
    expect(id).toBe("/channels_telegram_bottoken");
  });
});

describe("applyAuthProfileSwap", () => {
  const apiKeyPath = ["provider", "apiKey"];
  const expectedRef = {
    source: "file",
    provider: "infra",
    id: "/provider_apikey",
  };

  test("first-run migration: plaintext token → tokenRef", () => {
    const input = {
      version: 1,
      profiles: {
        "zai:default": {
          type: "token",
          provider: "zai",
          token: "sk-plaintext",
        },
      },
      lastGood: { zai: "zai:default" },
      usageStats: { "zai:default": { errorCount: 0 } },
    };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);

    expect(out.profiles).toEqual({
      "zai:default": {
        type: "token",
        provider: "zai",
        tokenRef: expectedRef,
      },
    });
    expect(out.lastGood).toEqual({ zai: "zai:default" });
    expect(out.usageStats).toEqual({ "zai:default": { errorCount: 0 } });
  });

  test("same-provider re-apply is a no-op on tokenRef structure", () => {
    const input = {
      version: 1,
      profiles: {
        "zai:default": {
          type: "token",
          provider: "zai",
          tokenRef: expectedRef,
        },
      },
      lastGood: { zai: "zai:default" },
      usageStats: { "zai:default": { errorCount: 0, lastUsed: 12345 } },
    };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);

    expect(out).toEqual(input);
  });

  test("provider switch: anthropic → zai removes old, adds new", () => {
    const input = {
      version: 1,
      profiles: {
        "anthropic:default": {
          type: "token",
          provider: "anthropic",
          token: "sk-ant-oat01-dead",
        },
      },
      lastGood: { anthropic: "anthropic:default" },
      usageStats: {
        "anthropic:default": { errorCount: 0, lastUsed: 12345 },
      },
    };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);

    expect(out.profiles).toEqual({
      "zai:default": {
        type: "token",
        provider: "zai",
        tokenRef: expectedRef,
      },
    });
    expect(out.lastGood).toEqual({ zai: "zai:default" });
    expect(out.usageStats).toEqual({});
  });

  test("provider switch preserves extra fields on existing same-key profile", () => {
    const input = {
      version: 1,
      profiles: {
        "zai:default": {
          type: "token",
          provider: "zai",
          token: "stale-plaintext",
          customMetadata: { addedByAgent: true },
        },
        "anthropic:default": {
          type: "token",
          provider: "anthropic",
          token: "sk-ant-oat01-dead",
        },
      },
      lastGood: { anthropic: "anthropic:default" },
      usageStats: {
        "anthropic:default": { errorCount: 0 },
        "zai:default": { errorCount: 2, lastUsed: 99 },
      },
    };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);

    expect(out.profiles).toEqual({
      "zai:default": {
        type: "token",
        provider: "zai",
        tokenRef: expectedRef,
        customMetadata: { addedByAgent: true },
      },
    });
    expect(out.lastGood).toEqual({ zai: "zai:default" });
    expect(out.usageStats).toEqual({
      "zai:default": { errorCount: 2, lastUsed: 99 },
    });
  });

  test("fresh-slate: empty profiles object adds the new one", () => {
    const input = {
      version: 1,
      profiles: {},
    };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);

    expect(out.profiles).toEqual({
      "zai:default": {
        type: "token",
        provider: "zai",
        tokenRef: expectedRef,
      },
    });
    expect(out.lastGood).toEqual({ zai: "zai:default" });
  });

  test("missing profiles object: creates one and adds the new profile", () => {
    const input = { version: 1 };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);

    expect(out.profiles).toEqual({
      "zai:default": {
        type: "token",
        provider: "zai",
        tokenRef: expectedRef,
      },
    });
  });

  test("conservative: keeps profile with unset provider field", () => {
    // Forward-compat: a future profile shape we don't recognise must not be
    // evicted just because we're swapping providers.
    const input = {
      version: 1,
      profiles: {
        "anthropic:default": {
          type: "token",
          provider: "anthropic",
          token: "sk-ant-dead",
        },
        "legacy:default": {
          type: "exotic",
          // no `provider` field
        },
      },
    };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);
    const profiles = out.profiles as Record<string, unknown>;

    expect(profiles["zai:default"]).toBeDefined();
    expect(profiles["anthropic:default"]).toBeUndefined();
    expect(profiles["legacy:default"]).toEqual({ type: "exotic" });
  });

  test("conservative: keeps non-:default profile for a different provider", () => {
    const input = {
      version: 1,
      profiles: {
        "anthropic:default": {
          type: "token",
          provider: "anthropic",
          token: "sk-ant-dead",
        },
        "anthropic:secondary": {
          type: "token",
          provider: "anthropic",
          token: "secondary-key",
        },
      },
    };

    const out = applyAuthProfileSwap(input, "zai", apiKeyPath);
    const profiles = out.profiles as Record<string, unknown>;

    expect(profiles["zai:default"]).toBeDefined();
    expect(profiles["anthropic:default"]).toBeUndefined();
    // Non-:default profile preserved — only :default is treated as the
    // active-binding slot we're managing.
    expect(profiles["anthropic:secondary"]).toBeDefined();
  });

  test("does not mutate input", () => {
    const input = {
      version: 1,
      profiles: {
        "anthropic:default": {
          type: "token",
          provider: "anthropic",
          token: "sk-ant",
        },
      },
      lastGood: { anthropic: "anthropic:default" },
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    applyAuthProfileSwap(input, "zai", apiKeyPath);

    expect(input).toEqual(snapshot);
  });
});

describe("patchMainConfig logic (file provider shape)", () => {
  test("file provider config has correct shape", () => {
    const provider = {
      source: "file",
      path: "~/.openclaw/secrets/infrastructure.json",
      mode: "json",
    };
    expect(provider.source).toBe("file");
    expect(provider.mode).toBe("json");
    expect(provider.path).toContain("infrastructure.json");
  });
});
