export interface ClawOutput<T> {
  status: "ok" | "error";
  data: T;
  errors: string[];
}

let jsonMode = false;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

/** Print progress/info to the appropriate stream (stderr in JSON mode, stdout otherwise). */
export function log(message: string): void {
  if (jsonMode) {
    process.stderr.write(message + "\n");
  } else {
    console.log(message);
  }
}

/** Print a success result. In JSON mode, outputs the envelope to stdout. */
export function ok<T>(data: T): void {
  if (jsonMode) {
    const output: ClawOutput<T> = { status: "ok", data, errors: [] };
    console.log(JSON.stringify(output));
  }
}

/** Print an error result. In JSON mode, outputs the envelope to stdout. */
export function fail(errors: string[], data?: unknown): void {
  if (jsonMode) {
    const output: ClawOutput<unknown> = { status: "error", data: data ?? null, errors };
    console.log(JSON.stringify(output));
  } else {
    for (const err of errors) {
      console.error(`Error: ${err}`);
    }
  }
}
