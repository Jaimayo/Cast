const REDACT_KEY =
  /prompt|negative|api[_-]?key|authorization|image[_-]?bytes|image_base64|adapter[_-]?bytes|password|secret|token|compiled/i;

function isPlainScalar(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * Structured log fields for workers. Drops compiled prompts, secrets, and payloads.
 */
function shouldRedactKey(key: string): boolean {
  // Keep SHA-256 fields (promptHash / compiledPromptHash). Never keep the prompt itself.
  if (/hash$/i.test(key)) return false;
  return REDACT_KEY.test(key);
}

export function publicJobLogFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (shouldRedactKey(key)) continue;
    if (!isPlainScalar(value)) continue;
    if (typeof value === "string" && value.length > 240) {
      out[key] = `${value.slice(0, 80)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function jobLog(event: string, fields: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      src: "cast",
      event,
      ts: new Date().toISOString(),
      ...publicJobLogFields(fields),
    }),
  );
}
