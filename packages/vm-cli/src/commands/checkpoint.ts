import { Command } from "commander";
import { writeFile, rename, access } from "fs/promises";
import { join } from "path";
import { constants } from "fs";
import { log, ok, fail, setJsonMode } from "../output.js";
import { PROJECT_MOUNT_POINT, CHECKPOINT_REQUEST_FILE } from "@clawctl/types";

interface CheckpointRequest {
  timestamp: string;
  message: string;
}

export function registerCheckpointCommand(program: Command): void {
  program
    .command("checkpoint")
    .description("Signal that data has changed (triggers host-side backup)")
    .option("--message <msg>", "Reason for the checkpoint", "Manual checkpoint")
    .option("--json", "Output structured JSON")
    .action(async (opts: { message: string; json?: boolean }) => {
      if (opts.json) setJsonMode(true);

      const dataDir = join(PROJECT_MOUNT_POINT, "data");
      const signalPath = join(dataDir, CHECKPOINT_REQUEST_FILE);
      const tmpPath = `${signalPath}.tmp`;

      // Warn if unconsumed request exists
      try {
        await access(signalPath, constants.F_OK);
        log("Warning: overwriting unconsumed checkpoint request");
      } catch {
        // No existing file — expected
      }

      const request: CheckpointRequest = {
        timestamp: new Date().toISOString(),
        message: opts.message,
      };

      try {
        // Atomic write: tmp + rename
        await writeFile(tmpPath, JSON.stringify(request, null, 2) + "\n");
        await rename(tmpPath, signalPath);
        log(`Checkpoint requested: ${opts.message}`);
        ok(request);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        fail([`Failed to write checkpoint: ${msg}`]);
        process.exit(1);
      }
    });
}
