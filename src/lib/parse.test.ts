import { describe, test, expect } from "bun:test";
import { extractGatewayToken, parseLimaVersion } from "./parse.js";

describe("extractGatewayToken", () => {
  test("extracts token from normal systemctl output", () => {
    const output = "Environment=OPENCLAW_GATEWAY_TOKEN=abc123xyz PORT=18789";
    expect(extractGatewayToken(output)).toBe("abc123xyz");
  });

  test("extracts token when it is the only env var", () => {
    const output = "Environment=OPENCLAW_GATEWAY_TOKEN=secret-token-42";
    expect(extractGatewayToken(output)).toBe("secret-token-42");
  });

  test("returns empty string when token is missing", () => {
    const output = "Environment=OTHER_VAR=value";
    expect(extractGatewayToken(output)).toBe("");
  });

  test("returns empty string for empty input", () => {
    expect(extractGatewayToken("")).toBe("");
  });

  test("returns empty string for malformed output", () => {
    expect(extractGatewayToken("no-equals-sign")).toBe("");
    expect(extractGatewayToken("OPENCLAW_GATEWAY_TOKEN")).toBe("");
  });

  test("handles multiline output", () => {
    const output = [
      "Type=simple",
      "Environment=OPENCLAW_GATEWAY_TOKEN=multiline-token",
      "ExecStart=/usr/bin/node",
    ].join("\n");
    expect(extractGatewayToken(output)).toBe("multiline-token");
  });
});

describe("parseLimaVersion", () => {
  test("parses standard version output", () => {
    expect(parseLimaVersion("limactl version 1.0.3")).toBe("1.0.3");
  });

  test("parses version with trailing newline", () => {
    expect(parseLimaVersion("limactl version 0.23.2\n")).toBe("0.23.2");
  });

  test("parses version with extra text after", () => {
    expect(parseLimaVersion("limactl version 1.2.3 (HEAD)")).toBe("1.2.3");
  });

  test("returns undefined for empty string", () => {
    expect(parseLimaVersion("")).toBeUndefined();
  });

  test("returns undefined for unrecognized format", () => {
    expect(parseLimaVersion("lima 1.0.0")).toBeUndefined();
    expect(parseLimaVersion("version 1.0.0")).toBeUndefined();
  });

  test("returns undefined for garbage input", () => {
    expect(parseLimaVersion("not a version string at all")).toBeUndefined();
  });
});
