import { NextResponse } from "next/server";
import { publicPack } from "@/lib/media";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { lockPack } from "@/server/packs";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const result = await lockPack(user.id, id);
    return NextResponse.json({ ...result, pack: result.pack ? publicPack(result.pack) : result.pack });
  } catch (err) {
    return jsonError(err);
  }
}
