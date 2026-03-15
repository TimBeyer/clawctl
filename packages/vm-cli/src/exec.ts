import { execa, type Options as ExecaOptions } from "execa";
import { isJsonMode } from "./output.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a command and return its result.
 *
 * By default, stdout/stderr are forwarded in real-time so the user can
 * follow installation progress. Pass `quiet: true` for commands whose
 * output should be captured silently (version checks, status queries).
 */
export async function exec(
  command: string,
  args: string[] = [],
  options?: ExecaOptions & { quiet?: boolean },
): Promise<ExecResult> {
  const { quiet, ...execaOpts } = options ?? {};
  const proc = execa(command, args, {
    reject: false,
    ...execaOpts,
  });

  if (!quiet) {
    // Forward subprocess output so the user can follow progress.
    // In JSON mode, route to stderr to keep stdout clean for the envelope.
    const target = isJsonMode() ? process.stderr : process.stdout;
    proc.stdout?.on("data", (chunk: Buffer) => target.write(chunk));
    proc.stderr?.on("data", (chunk: Buffer) => target.write(chunk));
  }

  const result = await proc;
  return {
    stdout: result.stdout as string,
    stderr: result.stderr as string,
    exitCode: result.exitCode ?? 1,
  };
}

export async function commandExists(command: string): Promise<boolean> {
  const result = await exec("which", [command], { quiet: true });
  return result.exitCode === 0;
}
