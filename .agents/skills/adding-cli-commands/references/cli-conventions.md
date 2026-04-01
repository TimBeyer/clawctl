# CLI Command Conventions

## Instance resolution

Every command that targets an instance uses `requireInstance(opts)` from
host-core. It resolves the instance in this order:

1. Explicit `-i <name>` / `--instance <name>` flag
2. Local `.clawctl` context file (set by `clawctl use`)
3. Global context (`~/.config/clawctl/context.json`)
4. Error if none found

## Positional `[name]` argument

Commands that **only** target an instance (no other positional args)
offer `[name]` as a convenience positional:

```
clawctl status [name]       # OK — no other positionals
clawctl start [name]        # OK
clawctl mount list [name]   # OK
```

Commands that have **other required positional arguments** must NOT use
`[name]` — Commander consumes the first positional as the optional name,
swallowing the real argument. Use `-i` or context resolution instead:

```
clawctl mount add <host-path> <guest-path>     # No [name] — would eat <host-path>
clawctl mount remove <guest-path>              # No [name] — would eat <guest-path>
```

## Subcommand groups

Parent commands (`mount`, `daemon`, `completions`) use Commander's nested
command pattern:

```typescript
const parentCmd = program
  .command("parent")
  .description("Description")
  .action(() => {
    parentCmd.help(); // Show help when called bare
  });

parentCmd
  .command("child")
  .description("...")
  .action(async () => { ... });
```

For subcommands with required positional args, add `.showHelpAfterError(true)`
so missing arguments show usage instead of a cryptic error.

## Naming conventions

- Command handlers: `runCommandName` (e.g., `runMountList`, `runDaemonStart`)
- File names: kebab-case matching the command (e.g., `mount.ts`, `daemon.ts`)
- One file per command or command group

## Error handling

- Use `process.exit(1)` for user errors (not found, invalid args)
- Let exceptions propagate for unexpected errors
- `requireInstance()` handles its own error output and exits
