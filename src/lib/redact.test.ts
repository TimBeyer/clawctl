import { describe, test, expect } from "bun:test";
import { redact, redactSecrets } from "./redact.js";

describe("redact", () => {
  test("shows first 3 and last 3 chars for long values", () => {
    expect(redact("db76b426a54581ad2c0beb5e")).toBe("db7***b5e");
  });

  test("fully masks short values (≤8 chars)", () => {
    expect(redact("short")).toBe("***");
    expect(redact("12345678")).toBe("***");
  });

  test("works at the boundary (9 chars)", () => {
    expect(redact("123456789")).toBe("123***789");
  });
});

describe("redactSecrets", () => {
  test("replaces all occurrences of secret values", () => {
    const text = 'config set token "my-secret-token-value"';
    expect(redactSecrets(text, ["my-secret-token-value"])).toBe('config set token "my-***lue"');
  });

  test("handles multiple secrets", () => {
    const text = "token=secret-aaa key=secret-bbb";
    expect(redactSecrets(text, ["secret-aaa", "secret-bbb"])).toBe("token=sec***aaa key=sec***bbb");
  });

  test("skips empty strings in secrets list", () => {
    const text = "nothing to redact";
    expect(redactSecrets(text, [""])).toBe("nothing to redact");
  });
});
