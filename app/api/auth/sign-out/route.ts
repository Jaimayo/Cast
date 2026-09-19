import { NextResponse } from "next/server";
import { revokeSessionCookie } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { revoked } = await revokeSessionCookie();
    return NextResponse.json({ ok: true, revoked });
  } catch (err) {
    return jsonError(err);
  }
}
