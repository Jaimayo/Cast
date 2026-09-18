import { NextResponse } from "next/server";
import { BODY_STARTERS, FACE_STARTERS } from "@/lib/starters";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    face: FACE_STARTERS.map(({ id, kind, label }) => ({ id, kind, label })),
    body: BODY_STARTERS.map(({ id, kind, label }) => ({ id, kind, label })),
  });
}
