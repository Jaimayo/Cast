import { NextResponse } from "next/server";
import { publicPack } from "@/lib/media";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import {
  countRefs,
  getPack,
  lastTrainJobForPack,
  listLibraryStills,
  listRefs,
  listStarterSheet,
} from "@/server/packs";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const pack = await getPack(user.id, id);
    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }
    const [refs, refCount, starters, library, lastTrainJob] = await Promise.all([
      listRefs(user.id, pack.id),
      countRefs(pack.id),
      listStarterSheet(user.id, pack.id),
      listLibraryStills(user.id),
      lastTrainJobForPack(user.id, pack.id),
    ]);
    return NextResponse.json({ pack: publicPack(pack), refs, refCount, starters, library, lastTrainJob });
  } catch (err) {
    return jsonError(err);
  }
}
