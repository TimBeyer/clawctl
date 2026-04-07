import { describe, test, expect } from "bun:test";
import { sanitizeKey, buildInfraSecrets } from "./secrets-sync.js";
import type { ResolvedSecretRef } from "./secrets.js";

describe("sanitizeKey", () => {
  test("joins path segments with underscore and lowercases", () => {
    expect(sanitizeKey(["provider", "apiKey"])).toBe("provider_apikey");
  });

  test("handles single segment", () => {
    expect(sanitizeKey(["botToken"])).toBe("bottoken");
  });

  test("handles deep paths", () => {
    expect(sanitizeKey(["channels", "telegram", "botToken"])).toBe("channels_telegram_bottoken");
  });

  test("lowercases mixed case", () => {
    expect(sanitizeKey(["capabilities", "one-password", "token"])).toBe(
      "capabilities_one-password_token",
    );
  });
});

describe("buildInfraSecrets", () => {
  test("builds flat object from resolved refs", () => {
    const resolvedMap: ResolvedSecretRef[] = [
      {
        path: ["provider", "apiKey"],
        reference: "op://V/I/f",
        scheme: "op",
        resolvedValue: "sk-abc123",
      },
      {
        path: ["channels", "telegram", "botToken"],
        reference: "op://V/Bot/token",
        scheme: "op",
        resolvedValue: "123:ABC",
      },
    ];

    const result = buildInfraSecrets(resolvedMap);
    expect(result).toEqual({
      provider_apikey: "sk-abc123",
      channels_telegram_bottoken: "123:ABC",
    });
  });

  test("returns empty object for empty input", () => {
    expect(buildInfraSecrets([])).toEqual({});
  });

  test("handles single ref", () => {
    const resolvedMap: ResolvedSecretRef[] = [
      {
        path: ["provider", "apiKey"],
        reference: "op://V/I/f",
        scheme: "op",
        resolvedValue: "sk-xyz",
      },
    ];

    const result = buildInfraSecrets(resolvedMap);
    expect(result).toEqual({ provider_apikey: "sk-xyz" });
  });
});
