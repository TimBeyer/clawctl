/**
 * Shell-quote an array of arguments for safe interpolation into a shell command.
 * Each argument is wrapped in single quotes with internal single quotes escaped.
 */
export function shellQuote(args: string[]): string {
  return args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
}
