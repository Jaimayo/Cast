import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "@/lib/db-errors";

describe("isUniqueViolation", () => {
  it("detects Postgres 23505 including wrapped causes", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation(new Error("duplicate"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
