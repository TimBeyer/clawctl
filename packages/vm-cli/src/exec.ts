import { execa, type Options as ExecaOptions } from "execa";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function exec(
  command: string,
  args: string[] = [],
  options?: ExecaOptions,
): Promise<ExecResult> {
  const result = await execa(command, args, {
    reject: false,
    ...options,
  });
  return {
    stdout: result.stdout as string,
    stderr: result.stderr as string,
    exitCode: result.exitCode ?? 1,
  };
}

export async function commandExists(command: string): Promise<boolean> {
  const result = await exec("which", [command]);
  return result.exitCode === 0;
}
