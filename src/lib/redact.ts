/**
 * Redact a secret for safe logging.
 *
 * Shows the first 3 and last 3 characters with *** in the middle.
 * Short values (≤8 chars) are fully masked to avoid leaking most of the value.
 */
export function redact(value: string): string {
  if (value.length <= 8) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

/**
 * Replace all occurrences of secret values in a string with their redacted form.
 */
export function redactSecrets(text: string, secrets: string[]): string {
  let result = text;
  for (const secret of secrets) {
    if (secret) {
      result = result.replaceAll(secret, redact(secret));
    }
  }
  return result;
}
