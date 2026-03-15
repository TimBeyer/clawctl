import embeddedClawPath from "../../../dist/claw" with { type: "file" };
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * In dev mode, the import resolves to the real `dist/claw` path.
 * In compiled mode, Bun embeds the file and exposes it via a virtual
 * `/$bunfs/` path that only Bun's own fs polyfills can read. External
 * tools (like `limactl copy`) need a real filesystem path, so we
 * extract the binary to a temp file.
 */
function resolveClawPath(): string {
  if (!embeddedClawPath.startsWith("/$bunfs/")) {
    return embeddedClawPath;
  }

  const content = readFileSync(embeddedClawPath);
  const dir = mkdtempSync(join(tmpdir(), "clawctl-"));
  const outPath = join(dir, "claw");
  writeFileSync(outPath, content, { mode: 0o755 });
  return outPath;
}

export const clawPath = resolveClawPath();
