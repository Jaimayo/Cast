import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { enqueueRetrainPack } from "@/server/packs";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const job = await enqueueRetrainPack(user.id, id);
    return NextResponse.json({ job }, { status: 202 });
  } catch (err) {
    return jsonError(err);
  }
}
