import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth-error";
import { JobError } from "@/lib/job-errors";
import { RateLimitError } from "@/lib/rate-limit";
import { ObjectNotFoundError } from "@/server/storage";
import { DatabaseRequiredError } from "@/lib/db-errors";

function looksLikeStorageLeak(message: string): boolean {
  return /ENOENT|EISDIR|ENOTDIR|NoSuchKey|AccessDenied|\.data[/\\]storage|still\/|pack_ref\/|starter\/|adapters\//i.test(
    message,
  );
}

function looksLikeInternalLeak(message: string): boolean {
  return /postgres:\/\/|ECONNREFUSED|ECONNRESET|ENOTFOUND|SASL|password authentication|relation ".+" does not exist|connect E|idle_in_transaction|duplicate key value|violates unique constraint|syntax error at|DATABASE_URL|SESSION_SECRET|at Object\.|at Module\.|Redis|BullMQ|Custom Id cannot|stack:/i.test(
    message,
  );
}

export function jsonError(err: unknown): NextResponse {
  if (err instanceof RateLimitError) {
    return NextResponse.json(
      { error: err.message, code: err.code, retryAfterSeconds: err.retryAfterSeconds },
      {
        status: 429,
        headers: { "Retry-After": String(err.retryAfterSeconds) },
      },
    );
  }
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof JobError) {
    return NextResponse.json({ error: err.userMessage, code: err.code }, { status: err.httpStatus });
  }
  if (err instanceof ObjectNotFoundError) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  if (err instanceof DatabaseRequiredError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  if (err instanceof Error) {
    if (looksLikeStorageLeak(err.message)) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    if (looksLikeInternalLeak(err.message)) {
      return NextResponse.json({ error: "Could not continue." }, { status: 500 });
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
