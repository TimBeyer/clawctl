import { describe, it, expect } from "bun:test";
import type { ProvisionConfig } from "@clawctl/types";
import {
  ALL_CAPABILITIES,
  isEnabled,
  getEnabledCapabilities,
  getHooksForPhase,
  basePhase,
  hookTiming,
} from "./registry.js";

function makeConfig(caps: Record<string, true | Record<string, unknown>> = {}): ProvisionConfig {
  return { capabilities: caps };
}

describe("registry", () => {
  describe("ALL_CAPABILITIES", () => {
    it("should have unique names", () => {
      const names = ALL_CAPABILITIES.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("should include core capabilities", () => {
      const coreNames = ALL_CAPABILITIES.filter((c) => c.core).map((c) => c.name);
      expect(coreNames).toContain("system-base");
      expect(coreNames).toContain("homebrew");
      expect(coreNames).toContain("openclaw");
      expect(coreNames).toContain("checkpoint");
    });

    it("should include optional capabilities", () => {
      const optNames = ALL_CAPABILITIES.filter((c) => !c.core).map((c) => c.name);
      expect(optNames).toContain("tailscale");
      expect(optNames).toContain("one-password");
    });
  });

  describe("isEnabled", () => {
    it("core capabilities are always enabled", () => {
      const core = ALL_CAPABILITIES.find((c) => c.name === "system-base")!;
      expect(isEnabled(core, makeConfig())).toBe(true);
      expect(isEnabled(core, makeConfig({ tailscale: true }))).toBe(true);
    });

    it("optional capabilities are enabled when in capabilities map", () => {
      const ts = ALL_CAPABILITIES.find((c) => c.name === "tailscale")!;
      expect(isEnabled(ts, makeConfig())).toBe(false);
      expect(isEnabled(ts, makeConfig({ tailscale: true }))).toBe(true);
    });

    it("one-password enabled via backwards-compat flag", () => {
      const op = ALL_CAPABILITIES.find((c) => c.name === "one-password")!;
      expect(isEnabled(op, { capabilities: {}, onePassword: true })).toBe(true);
      expect(isEnabled(op, { capabilities: {}, onePassword: false })).toBe(false);
    });

    it("tailscale enabled via backwards-compat flag", () => {
      const ts = ALL_CAPABILITIES.find((c) => c.name === "tailscale")!;
      expect(isEnabled(ts, { capabilities: {}, tailscale: true })).toBe(true);
    });
  });

  describe("getEnabledCapabilities", () => {
    it("returns only core with empty config", () => {
      const enabled = getEnabledCapabilities(makeConfig());
      expect(enabled.every((c) => c.core)).toBe(true);
      expect(enabled.length).toBe(4); // system-base, homebrew, openclaw, checkpoint
    });

    it("includes optional when enabled", () => {
      const enabled = getEnabledCapabilities(makeConfig({ tailscale: true }));
      expect(enabled.map((c) => c.name)).toContain("tailscale");
    });
  });

  describe("basePhase", () => {
    it("strips pre: prefix", () => {
      expect(basePhase("pre:provision-system")).toBe("provision-system");
    });

    it("strips post: prefix", () => {
      expect(basePhase("post:provision-tools")).toBe("provision-tools");
    });

    it("returns plain phase as-is", () => {
      expect(basePhase("provision-system")).toBe("provision-system");
    });
  });

  describe("hookTiming", () => {
    it("returns pre for pre: prefix", () => {
      expect(hookTiming("pre:provision-system")).toBe("pre");
    });

    it("returns post for post: prefix", () => {
      expect(hookTiming("post:provision-system")).toBe("post");
    });

    it("returns main for plain phase", () => {
      expect(hookTiming("provision-system")).toBe("main");
    });
  });

  describe("getHooksForPhase", () => {
    it("returns hooks for provision-system phase", () => {
      const hooks = getHooksForPhase("provision-system", makeConfig());
      expect(hooks.length).toBeGreaterThan(0);
      expect(hooks.some((h) => h.capability.name === "system-base")).toBe(true);
    });

    it("excludes disabled optional capabilities", () => {
      const hooks = getHooksForPhase("provision-system", makeConfig());
      expect(hooks.some((h) => h.capability.name === "tailscale")).toBe(false);
    });

    it("includes enabled optional capabilities", () => {
      const hooks = getHooksForPhase("provision-system", makeConfig({ tailscale: true }));
      expect(hooks.some((h) => h.capability.name === "tailscale")).toBe(true);
    });

    it("respects dependency order (system-base before tailscale)", () => {
      const hooks = getHooksForPhase("provision-system", makeConfig({ tailscale: true }));
      const systemIdx = hooks.findIndex((h) => h.capability.name === "system-base");
      const tsIdx = hooks.findIndex((h) => h.capability.name === "tailscale");
      expect(systemIdx).toBeLessThan(tsIdx);
    });

    it("returns multi-phase capability hooks for each phase", () => {
      const config = makeConfig({ "one-password": true });
      const toolsHooks = getHooksForPhase("provision-tools", config);
      const workspaceHooks = getHooksForPhase("provision-workspace", config);
      expect(toolsHooks.some((h) => h.capability.name === "one-password")).toBe(true);
      expect(workspaceHooks.some((h) => h.capability.name === "one-password")).toBe(true);
    });

    it("homebrew comes before one-password in tools phase", () => {
      const config = makeConfig({ "one-password": true });
      const hooks = getHooksForPhase("provision-tools", config);
      const brewIdx = hooks.findIndex((h) => h.capability.name === "homebrew");
      const opIdx = hooks.findIndex((h) => h.capability.name === "one-password");
      expect(brewIdx).toBeLessThan(opIdx);
    });
  });
});
