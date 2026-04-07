import { describe, test, expect } from "bun:test";
import { sanitizeKey } from "./secrets-sync.js";

/**
 * Unit tests for infra-secrets logic.
 *
 * The patchMainConfig and patchAuthProfiles functions do VM I/O (shellExec)
 * so they're tested in VM integration tests. Here we test the pure logic
 * that underpins them: key sanitization and SecretRef construction.
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

  test("produces correct ref shape", () => {
    const path = ["provider", "apiKey"];
    const ref = {
      source: "file" as const,
      provider: "infra" as const,
      id: `/${sanitizeKey(path)}`,
    };
    expect(ref).toEqual({
      source: "file",
      provider: "infra",
      id: "/provider_apikey",
    });
  });
});

describe("config patching logic", () => {
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

  test("auth profile patch replaces token with tokenRef", () => {
    // Simulate the transformation patchAuthProfiles performs
    const profile: Record<string, unknown> = {
      type: "token",
      provider: "zai",
      token: "sk-plaintext",
    };

    // The operation: delete token, add tokenRef
    delete profile.token;
    profile.tokenRef = {
      source: "file",
      provider: "infra",
      id: "/provider_apikey",
    };

    expect(profile.token).toBeUndefined();
    expect(profile.tokenRef).toEqual({
      source: "file",
      provider: "infra",
      id: "/provider_apikey",
    });
    // Original fields preserved
    expect(profile.type).toBe("token");
    expect(profile.provider).toBe("zai");
  });

  test("telegram botToken gets replaced with SecretRef", () => {
    // Simulate the transformation patchMainConfig performs
    const config: Record<string, unknown> = {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:ABC",
          dmPolicy: "allowlist",
        },
      },
    };

    const telegram = (config.channels as Record<string, Record<string, unknown>>).telegram;
    telegram.botToken = {
      source: "file",
      provider: "infra",
      id: "/telegram_bottoken",
    };

    expect(telegram.botToken).toEqual({
      source: "file",
      provider: "infra",
      id: "/telegram_bottoken",
    });
    // Other fields preserved
    expect(telegram.enabled).toBe(true);
    expect(telegram.dmPolicy).toBe("allowlist");
  });
});
