import { describe, test, expect } from "bun:test";
import { exec, execWithLogs } from "./exec.js";

describe("exec", () => {
  test("captures stdout from a simple command", async () => {
    const result = await exec("echo", ["hello"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
  });

  test("returns non-zero exit code on failure", async () => {
    const result = await exec("false");
    expect(result.exitCode).not.toBe(0);
  });

  test("captures stderr", async () => {
    const result = await exec("bash", ["-c", "echo oops >&2"]);
    expect(result.stderr.trim()).toBe("oops");
  });
});

describe("execWithLogs", () => {
  test("streams stdout lines to onLine callback", async () => {
    const lines: string[] = [];
    const result = await execWithLogs(
      "bash",
      ["-c", 'echo "line1"; echo "line2"; echo "line3"'],
      (line) => lines.push(line),
    );
    expect(result.exitCode).toBe(0);
    expect(lines).toEqual(["line1", "line2", "line3"]);
  });

  test("streams stderr lines to onLine callback", async () => {
    const lines: string[] = [];
    await execWithLogs("bash", ["-c", "echo err1 >&2; echo err2 >&2"], (line) => lines.push(line));
    expect(lines).toEqual(["err1", "err2"]);
  });

  test("streams both stdout and stderr interleaved", async () => {
    const lines: string[] = [];
    await execWithLogs("bash", ["-c", "echo out1; echo err1 >&2"], (line) => lines.push(line));
    expect(lines).toContain("out1");
    expect(lines).toContain("err1");
    expect(lines.length).toBe(2);
  });

  test("skips blank lines", async () => {
    const lines: string[] = [];
    await execWithLogs("bash", ["-c", 'echo "a"; echo ""; echo "b"'], (line) => lines.push(line));
    expect(lines).toEqual(["a", "b"]);
  });

  test("still returns full stdout/stderr in result", async () => {
    const result = await execWithLogs("bash", ["-c", "echo hello; echo world >&2"], () => {});
    expect(result.stdout.trim()).toBe("hello");
    expect(result.stderr.trim()).toBe("world");
    expect(result.exitCode).toBe(0);
  });

  test("returns non-zero exit code on failure", async () => {
    const result = await execWithLogs("bash", ["-c", "echo fail; exit 42"], () => {});
    expect(result.exitCode).toBe(42);
  });
});
