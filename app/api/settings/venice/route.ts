import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
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
    const user = await requireAttestedUser();
    const venice = await getVenicePublicStatus({ userId: user.id, email: user.email });
    return NextResponse.json({ venice });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAttestedUser();
    const body = (await request.json().catch(() => ({}))) as { apiKey?: unknown };
    const apiKey = assertVeniceApiKeyShape(body.apiKey);
    await validateVeniceApiKey(apiKey);
    const venice = await saveVeniceApiKey({ apiKey, userId: user.id, email: user.email });
    return NextResponse.json({ venice });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireAttestedUser();
    const venice = await disconnectVeniceApiKey(user.id, user.email);
    return NextResponse.json({ venice });
  } catch (err) {
    return jsonError(err);
  }
}
