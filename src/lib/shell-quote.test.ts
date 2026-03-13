import { describe, test, expect } from "bun:test";
import { shellQuote } from "./shell-quote.js";

describe("shellQuote", () => {
  test("simple arguments", () => {
    expect(shellQuote(["echo", "hello"])).toBe("'echo' 'hello'");
  });

  test("arguments with spaces", () => {
    expect(shellQuote(["echo", "hello world"])).toBe("'echo' 'hello world'");
  });

  test("arguments with single quotes", () => {
    expect(shellQuote(["echo", "it's"])).toBe("'echo' 'it'\\''s'");
  });

  test("arguments with special characters", () => {
    expect(shellQuote(["echo", "$HOME", "foo;bar", "a&b"])).toBe("'echo' '$HOME' 'foo;bar' 'a&b'");
  });

  test("empty string argument", () => {
    expect(shellQuote(["echo", ""])).toBe("'echo' ''");
  });

  test("single argument", () => {
    expect(shellQuote(["whoami"])).toBe("'whoami'");
  });

  test("empty array", () => {
    expect(shellQuote([])).toBe("");
  });

  test("multiple single quotes", () => {
    expect(shellQuote(["it's a 'test'"])).toBe("'it'\\''s a '\\''test'\\'''");
  });
});
