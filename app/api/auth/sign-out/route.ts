import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
