/**
 * Real ProvisionContext implementation.
 *
 * Wires the SDK interface to vm-cli's existing tool functions.
 * This is the only file that imports vm-cli internals — capabilities
 * only ever see the ProvisionContext interface.
 */

import type { ProvisionContext } from "@clawctl/types";
import { exec, commandExists } from "../exec.js";
import { log } from "../output.js";
import { readFile, writeFile, mkdir, chmod, rename, rm, stat, access } from "fs/promises";
import { constants } from "fs";
import { ensureLineInFile, ensureDir } from "../tools/fs.js";
import { downloadFile, downloadAndRun } from "../tools/curl.js";
import { ensureInBashrc, ensureInProfile, ensurePath } from "../tools/shell-profile.js";
import { readProvisionConfig } from "../tools/provision-config.js";

/** Create a real ProvisionContext that delegates to vm-cli primitives. */
export function createProvisionContext(): ProvisionContext {
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

    readProvisionConfig,
  };
}
