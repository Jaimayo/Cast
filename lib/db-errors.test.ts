import { describe, expect, it } from "vitest";
import { DatabaseRequiredError, isUniqueViolation } from "@/lib/db-errors";

describe("isUniqueViolation", () => {
  it("detects Postgres 23505 including wrapped causes", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation(new Error("duplicate"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("DatabaseRequiredError", () => {
  it("is a user-safe 503 without a connection string", () => {
    const err = new DatabaseRequiredError();
    expect(err.status).toBe(503);
    expect(err.message).toBe("Studio data needs a database.");
    expect(err.message).not.toMatch(/postgres:\/\//);
  });
});
