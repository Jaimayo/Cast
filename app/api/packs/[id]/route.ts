import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { countRefs, getPack, listRefs } from "@/server/packs";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const pack = await getPack(user.id, id);
    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }
    const refs = await listRefs(user.id, pack.id);
    return NextResponse.json({ pack, refs, refCount: await countRefs(pack.id) });
  } catch (err) {
    return jsonError(err);
  }
}
