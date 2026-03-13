import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { findSecretRefs, hasOpRefs, resolveEnvRefs, getNestedValue } from "./secrets.js";

// -- findSecretRefs -----------------------------------------------------------

describe("findSecretRefs", () => {
  test("finds op:// references", () => {
    const refs = findSecretRefs({
      provider: { apiKey: "op://Vault/Item/field" },
    });
    expect(refs).toEqual([
      { path: ["provider", "apiKey"], reference: "op://Vault/Item/field", scheme: "op" },
    ]);
  });

  test("finds env:// references", () => {
    const refs = findSecretRefs({
      services: { onePassword: { serviceAccountToken: "env://OP_SERVICE_ACCOUNT_TOKEN" } },
    });
    expect(refs).toEqual([
      {
        path: ["services", "onePassword", "serviceAccountToken"],
        reference: "env://OP_SERVICE_ACCOUNT_TOKEN",
        scheme: "env",
      },
    ]);
  });

  test("finds multiple references at different depths", () => {
    const refs = findSecretRefs({
      provider: { apiKey: "op://V/I/f" },
      telegram: { botToken: "op://V/Bot/token" },
      services: { onePassword: { serviceAccountToken: "env://OP_TOKEN" } },
    });
    expect(refs).toHaveLength(3);
    expect(refs.map((r) => r.scheme)).toEqual(
      ["provider", "telegram", "services"].length ? ["op", "op", "env"] : [],
    );
  });

  test("ignores plain strings", () => {
    const refs = findSecretRefs({
      name: "my-agent",
      provider: { type: "anthropic", apiKey: "sk-ant-abc123" },
    });
    expect(refs).toHaveLength(0);
  });

  test("ignores string arrays", () => {
    const refs = findSecretRefs({
      tags: ["some-tag", "op://not-a-ref"],
    });
    expect(refs).toHaveLength(0);
  });

  test("handles empty object", () => {
    expect(findSecretRefs({})).toEqual([]);
  });

  test("rejects env:// with invalid var names", () => {
    const refs = findSecretRefs({
      key: "env://123INVALID",
    });
    expect(refs).toHaveLength(0);
  });

  test("rejects op:// with too few path segments", () => {
    const refs = findSecretRefs({
      key: "op://only-two-parts",
    });
    expect(refs).toHaveLength(0);
  });

  test("accepts op:// with four-part path (section/field)", () => {
    const refs = findSecretRefs({
      key: "op://Vault/Item/Section/field",
    });
    expect(refs).toHaveLength(1);
    expect(refs[0].scheme).toBe("op");
  });
});

// -- hasOpRefs ----------------------------------------------------------------

describe("hasOpRefs", () => {
  test("returns true when op:// refs exist", () => {
    expect(hasOpRefs({ provider: { apiKey: "op://V/I/f" } })).toBe(true);
  });

  test("returns false when only env:// refs exist", () => {
    expect(hasOpRefs({ token: "env://MY_TOKEN" })).toBe(false);
  });

  test("returns false for plain values", () => {
    expect(hasOpRefs({ name: "test", provider: { apiKey: "sk-ant-abc" } })).toBe(false);
  });
});

// -- resolveEnvRefs -----------------------------------------------------------

describe("resolveEnvRefs", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.TEST_API_KEY = process.env.TEST_API_KEY;
    savedEnv.TEST_BOT_TOKEN = process.env.TEST_BOT_TOKEN;
    process.env.TEST_API_KEY = "resolved-api-key";
    process.env.TEST_BOT_TOKEN = "resolved-bot-token";
  });

  afterEach(() => {
    if (savedEnv.TEST_API_KEY === undefined) delete process.env.TEST_API_KEY;
    else process.env.TEST_API_KEY = savedEnv.TEST_API_KEY;
    if (savedEnv.TEST_BOT_TOKEN === undefined) delete process.env.TEST_BOT_TOKEN;
    else process.env.TEST_BOT_TOKEN = savedEnv.TEST_BOT_TOKEN;
  });

  test("resolves env:// references from process.env", () => {
    const result = resolveEnvRefs({
      services: { onePassword: { serviceAccountToken: "env://TEST_API_KEY" } },
    });
    expect(
      (result.services as Record<string, Record<string, string>>).onePassword.serviceAccountToken,
    ).toBe("resolved-api-key");
  });

  test("resolves multiple env:// references", () => {
    const result = resolveEnvRefs({
      provider: { apiKey: "env://TEST_API_KEY" },
      telegram: { botToken: "env://TEST_BOT_TOKEN" },
    });
    expect((result.provider as Record<string, string>).apiKey).toBe("resolved-api-key");
    expect((result.telegram as Record<string, string>).botToken).toBe("resolved-bot-token");
  });

  test("leaves non-ref values unchanged", () => {
    const result = resolveEnvRefs({
      name: "test",
      provider: { type: "anthropic", apiKey: "env://TEST_API_KEY" },
    });
    expect(result.name).toBe("test");
    expect((result.provider as Record<string, string>).type).toBe("anthropic");
  });

  test("leaves op:// references untouched", () => {
    const result = resolveEnvRefs({
      provider: { apiKey: "op://Vault/Item/field" },
    });
    expect((result.provider as Record<string, string>).apiKey).toBe("op://Vault/Item/field");
  });

  test("does not mutate the original object", () => {
    const original = { key: "env://TEST_API_KEY" };
    resolveEnvRefs(original);
    expect(original.key).toBe("env://TEST_API_KEY");
  });

  test("throws when env var is not set", () => {
    expect(() => resolveEnvRefs({ key: "env://NONEXISTENT_VAR_12345" })).toThrow(
      "NONEXISTENT_VAR_12345 is not set or empty",
    );
  });

  test("throws when env var is empty string", () => {
    process.env.EMPTY_VAR_TEST = "";
    try {
      expect(() => resolveEnvRefs({ key: "env://EMPTY_VAR_TEST" })).toThrow(
        "EMPTY_VAR_TEST is not set or empty",
      );
    } finally {
      delete process.env.EMPTY_VAR_TEST;
    }
  });

  test("includes field path in error message", () => {
    expect(() =>
      resolveEnvRefs({ services: { onePassword: { token: "env://MISSING_XYZ" } } }),
    ).toThrow("services.onePassword.token");
  });
});

// -- getNestedValue -----------------------------------------------------------

describe("getNestedValue", () => {
  test("gets value at nested path", () => {
    const obj = { provider: { apiKey: "sk-abc" } };
    expect(getNestedValue(obj, ["provider", "apiKey"])).toBe("sk-abc");
  });

  test("gets top-level value", () => {
    const obj = { name: "test" };
    expect(getNestedValue(obj, ["name"])).toBe("test");
  });

  test("returns undefined for missing path", () => {
    const obj = { provider: { apiKey: "sk-abc" } };
    expect(getNestedValue(obj, ["provider", "missing"])).toBeUndefined();
  });

  test("returns undefined when intermediate path is not an object", () => {
    const obj = { provider: "not-an-object" };
    expect(getNestedValue(obj, ["provider", "apiKey"])).toBeUndefined();
  });

  test("returns undefined for empty path on non-matching key", () => {
    const obj = { a: { b: { c: "deep" } } };
    expect(getNestedValue(obj, ["a", "b", "c"])).toBe("deep");
    expect(getNestedValue(obj, ["a", "x"])).toBeUndefined();
  });
});
