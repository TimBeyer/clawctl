import type { CapabilityDef } from "@clawctl/types";
import { provisionNode } from "./node.js";

const APT_PACKAGES = ["build-essential", "git", "curl", "unzip", "jq", "ca-certificates", "gnupg"];

export const systemBase: CapabilityDef = {
  name: "system-base",
  label: "System base",
  version: "1.0.0",
  core: true,
  hooks: {
    "provision-system": {
      execContext: "root",
      steps: [
        {
          name: "apt-packages",
          label: "APT packages",
          run: async (ctx) => {
            try {
              const toInstall: string[] = [];
              for (const pkg of APT_PACKAGES) {
                if (!(await ctx.apt.isInstalled(pkg))) {
                  toInstall.push(pkg);
                }
              }
              if (toInstall.length === 0) {
                ctx.log("All apt packages already installed");
                return { name: "apt-packages", status: "unchanged" };
              }
              ctx.log(`Installing apt packages: ${toInstall.join(" ")}`);
              await ctx.apt.install(toInstall);
              return { name: "apt-packages", status: "installed", detail: toInstall.join(", ") };
            } catch (err) {
              return { name: "apt-packages", status: "failed", error: String(err) };
            }
          },
        },
        { name: "nodejs", label: "Node.js", run: (ctx) => provisionNode(ctx) },
        {
          name: "systemd-linger",
          label: "systemd linger",
          run: async (ctx) => {
            try {
              const user = await ctx.systemd.findDefaultUser();
              await ctx.systemd.enableLinger(user);
              ctx.log(`systemd linger enabled for ${user}`);
              return { name: "systemd-linger", status: "installed", detail: user };
            } catch (err) {
              return { name: "systemd-linger", status: "failed", error: String(err) };
            }
          },
        },
      ],
      doctorChecks: [
        {
          name: "path-claw",
          availableAfter: "vm-created",
          run: async (ctx) => {
            const found = await ctx.commandExists("claw");
            return { passed: found, error: found ? undefined : "claw not found on PATH" };
          },
        },
        {
          name: "path-node",
          run: async (ctx) => {
            const found = await ctx.commandExists("node");
            return { passed: found, error: found ? undefined : "node not found on PATH" };
          },
        },
      ],
    },
  },
};
