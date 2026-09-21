import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { jsonError } from "@/server/http";
import { validateVeniceApiKey } from "@/server/providers/venice";
import {
  assertVeniceApiKeyShape,
  disconnectVeniceApiKey,
  getVenicePublicStatus,
  saveVeniceApiKey,
} from "@/server/venice-secret";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const venice = await getVenicePublicStatus();
    return NextResponse.json({ venice });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as { apiKey?: unknown };
    const apiKey = assertVeniceApiKeyShape(body.apiKey);
    await validateVeniceApiKey(apiKey);
    const venice = await saveVeniceApiKey({ apiKey, actorId: admin.id });
    return NextResponse.json({ venice });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  try {
    const admin = await requireAdmin();
    const venice = await disconnectVeniceApiKey(admin.id);
    return NextResponse.json({ venice });
  } catch (err) {
    return jsonError(err);
  }
}
