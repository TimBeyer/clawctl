/**
 * Build script for clawctl binaries.
 *
 * Usage:
 *   bun scripts/build.ts              Build claw + clawctl (current platform)
 *   bun scripts/build.ts claw         Build claw only (linux-arm64)
 *   bun scripts/build.ts release      Build claw + clawctl (darwin-arm64)
 */

const SHARED = {
  format: "esm",
  minify: true,
  sourcemap: "inline",
  bytecode: true,
} as const;

async function buildClaw() {
  console.log("Building claw (linux-arm64)...");
  const result = await Bun.build({
    entrypoints: ["./packages/vm-cli/bin/claw.ts"],
    compile: {
      target: "bun-linux-arm64",
      outfile: "./dist/claw",
    },
    ...SHARED,
  });
  if (!result.success) {
    console.error("claw build failed:");
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  console.log("  ✓ dist/claw");
}

async function buildClawctl(target?: string) {
  console.log(`Building clawctl${target ? ` (${target})` : ""}...`);
  const result = await Bun.build({
    entrypoints: ["./packages/cli/bin/cli.tsx"],
    compile: {
      ...(target && { target: target as Bun.Target }),
      outfile: "./dist/clawctl",
    },
    ...SHARED,
  });
  if (!result.success) {
    console.error("clawctl build failed:");
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  console.log("  ✓ dist/clawctl");
}

const command = process.argv[2] ?? "all";

switch (command) {
  case "claw":
    await buildClaw();
    break;
  case "release":
    await buildClaw();
    await buildClawctl("bun-darwin-arm64");
    break;
  case "all":
    await buildClaw();
    await buildClawctl();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: bun scripts/build.ts [claw|release|all]");
    process.exit(1);
}
