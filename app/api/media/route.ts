import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

/** No directory listing under `/api/media`. */
export async function GET() {
  try {
    await requireAttestedUser();
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  } catch (err) {
    return jsonError(err);
  }
}
