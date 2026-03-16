/**
 * Real CapabilityContext implementation.
 *
 * Wires the SDK interface to vm-cli's existing tool functions.
 * This is the only file that imports vm-cli internals — capabilities
 * only ever see the CapabilityContext interface.
 */

import { join } from "path";
import type { CapabilityContext } from "@clawctl/types";
import { PROJECT_MOUNT_POINT } from "@clawctl/types";
import { exec, commandExists } from "../exec.js";
import { log } from "../output.js";
import { readFile, writeFile, mkdir, chmod, rename, rm, stat, access } from "fs/promises";
import { constants } from "fs";
import { ensureLineInFile, ensureDir } from "../tools/fs.js";
import { downloadFile, downloadAndRun } from "../tools/curl.js";
import { ensureInBashrc, ensureInProfile, ensurePath } from "../tools/shell-profile.js";
import { readProvisionConfig } from "../tools/provision-config.js";
import * as systemdTool from "../tools/systemd.js";

// --- AGENTS.md constants ---

const START_MARKER = "<!-- clawctl:managed:start -->";
const END_MARKER = "<!-- clawctl:managed:end -->";
const AGENTS_MD_PATH = join(PROJECT_MOUNT_POINT, "data", "workspace", "AGENTS.md");

/** Build a marker-delimited section for a single owner. */
function ownerStartMarker(owner: string): string {
  return `<!-- clawctl:${owner}:start -->`;
}
function ownerEndMarker(owner: string): string {
  return `<!-- clawctl:${owner}:end -->`;
}

/**
 * Update a single owner's section within the AGENTS.md managed block.
 * Idempotent: creates the file/managed block/owner section as needed.
 */
async function updateAgentsMdSection(owner: string, content: string): Promise<void> {
  const startOwner = ownerStartMarker(owner);
  const endOwner = ownerEndMarker(owner);
  const ownerBlock = [startOwner, content, endOwner].join("\n");

  let fileContent: string;
  try {
    fileContent = await readFile(AGENTS_MD_PATH, "utf-8");
  } catch {
    // File doesn't exist — create with managed section + owner block
    const managed = [
      START_MARKER,
      "## Operational Rules (managed by clawctl)",
      "",
      "> Do not edit this section — it is regenerated during provisioning.",
      "",
      ownerBlock,
      "",
      END_MARKER,
    ].join("\n");
    await ensureDir(join(PROJECT_MOUNT_POINT, "data", "workspace"));
    await writeFile(AGENTS_MD_PATH, managed + "\n");
    log(`AGENTS.md created with ${owner} section`);
    return;
  }

  const managedStart = fileContent.indexOf(START_MARKER);
  const managedEnd = fileContent.indexOf(END_MARKER);

  if (managedStart === -1 || managedEnd === -1) {
    // No managed section — append one
    const managed = [
      "",
      START_MARKER,
      "## Operational Rules (managed by clawctl)",
      "",
      "> Do not edit this section — it is regenerated during provisioning.",
      "",
      ownerBlock,
      "",
      END_MARKER,
    ].join("\n");
    const separator = fileContent.endsWith("\n") ? "" : "\n";
    await writeFile(AGENTS_MD_PATH, fileContent + separator + managed + "\n");
    log(`AGENTS.md managed section appended with ${owner} section`);
    return;
  }

  // Managed section exists — find or add owner block within it
  const managedContent = fileContent.slice(managedStart, managedEnd + END_MARKER.length);
  const ownerStart = managedContent.indexOf(startOwner);
  const ownerEnd = managedContent.indexOf(endOwner);

  let updatedManaged: string;
  if (ownerStart !== -1 && ownerEnd !== -1) {
    // Replace existing owner block
    const existing = managedContent.slice(ownerStart, ownerEnd + endOwner.length);
    if (existing === ownerBlock) {
      log(`AGENTS.md ${owner} section already up to date`);
      return;
    }
    updatedManaged =
      managedContent.slice(0, ownerStart) +
      ownerBlock +
      managedContent.slice(ownerEnd + endOwner.length);
  } else {
    // Insert owner block before the end marker
    const insertPoint = managedContent.indexOf(END_MARKER);
    updatedManaged =
      managedContent.slice(0, insertPoint) +
      ownerBlock +
      "\n\n" +
      managedContent.slice(insertPoint);
  }

  const updated =
    fileContent.slice(0, managedStart) +
    updatedManaged +
    fileContent.slice(managedEnd + END_MARKER.length);
  await writeFile(AGENTS_MD_PATH, updated);
  log(`AGENTS.md ${owner} section updated`);
}

// --- APT helpers ---

async function aptIsInstalled(pkg: string): Promise<boolean> {
  const result = await exec("dpkg", ["-l", pkg], { quiet: true });
  return result.exitCode === 0 && result.stdout.includes("ii");
}

async function aptInstall(packages: string[]): Promise<void> {
  await exec("apt-get", ["update", "-qq"]);
  const result = await exec("apt-get", ["install", "-y", "-qq", ...packages]);
  if (result.exitCode !== 0) {
    throw new Error(`apt-get install failed: ${result.stderr}`);
  }
}

/** Create a real CapabilityContext that delegates to vm-cli primitives. */
export function createCapabilityContext(): CapabilityContext {
  return {
    exec: (command, args, opts) =>
      exec(command, args ?? [], {
        quiet: opts?.quiet,
        env: opts?.env as Record<string, string> | undefined,
      }),
    commandExists,
    log,

    fs: {
      readFile: (path, encoding) =>
        readFile(path, (encoding ?? "utf-8") as BufferEncoding) as Promise<string>,
      writeFile: (path, content) => writeFile(path, content),
      mkdir: (path, opts) => mkdir(path, opts) as Promise<void>,
      chmod: (path, mode) => chmod(path, mode),
      rename: (from, to) => rename(from, to),
      rm: (path, opts) => rm(path, opts),
      stat: (path) => stat(path),
      access: (path, mode) => access(path, mode ?? constants.F_OK),
      ensureLineInFile,
      ensureDir,
    },

    net: {
      downloadFile,
      downloadAndRun,
    },

    profile: {
      ensureInBashrc,
      ensureInProfile,
      ensurePath,
    },

    apt: {
      install: aptInstall,
      isInstalled: aptIsInstalled,
    },

    systemd: {
      enable: systemdTool.enable,
      isEnabled: systemdTool.isEnabled,
      isActive: systemdTool.isActive,
      daemonReload: systemdTool.daemonReload,
      enableLinger: systemdTool.enableLinger,
      findDefaultUser: systemdTool.findDefaultUser,
    },

    agentsMd: {
      update: updateAgentsMdSection,
    },

    readProvisionConfig,
  };
}
