import { execa, type Options as ExecaOptions, type ResultPromise } from "execa";

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

export function execStream(
  command: string,
  args: string[] = [],
  options?: ExecaOptions,
): ResultPromise {
  return execa(command, args, {
    reject: false,
    ...options,
  });
}

export async function execWithLogs(
  command: string,
  args: string[] = [],
  onLine: (line: string) => void,
  options?: ExecaOptions,
): Promise<ExecResult> {
  const proc = execa(command, args, {
    reject: false,
    ...options,
  });

  if (proc.stdout) {
    let buffer = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) onLine(line);
      }
    });
  }

  if (proc.stderr) {
    let buffer = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) onLine(line);
      }
    });
  }

  const result = await proc;
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
