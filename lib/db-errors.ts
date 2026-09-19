/** Postgres unique_violation, including when Drizzle wraps the original error. */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i += 1) {
    if (typeof current === "object" && current !== null && "code" in current) {
      if ((current as { code: unknown }).code === "23505") {
        return true;
      }
    }
    if (typeof current === "object" && current !== null && "cause" in current) {
      current = (current as { cause: unknown }).cause;
      continue;
    }
    break;
  }
  return false;
}

export class DatabaseRequiredError extends Error {
  readonly status = 503;

  constructor() {
    super("Studio data needs a database.");
    this.name = "DatabaseRequiredError";
  }
}
