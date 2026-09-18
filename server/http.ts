import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth-error";
import { ObjectNotFoundError } from "@/server/storage";

function looksLikeStorageLeak(message: string): boolean {
  return /ENOENT|EISDIR|ENOTDIR|NoSuchKey|AccessDenied|\.data[/\\]storage|still\/|pack_ref\/|starter\/|adapters\//i.test(
    message,
  );
}

export function jsonError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ObjectNotFoundError) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  if (err instanceof Error) {
    if (looksLikeStorageLeak(err.message)) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
