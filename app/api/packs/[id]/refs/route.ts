import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { attachRef, listLibraryStills, listRefs } from "@/server/packs";

export const dynamic = "force-dynamic";

const attachSchema = z.object({
  mediaAssetId: z.string().uuid(),
  kind: z.enum(["face_ref", "body_ref", "still"]).default("still"),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const refs = await listRefs(user.id, id);
    const library = await listLibraryStills(user.id);
    return NextResponse.json({ refs, library });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const body = attachSchema.parse(await request.json());
    const ref = await attachRef({
      userId: user.id,
      packId: id,
      mediaAssetId: body.mediaAssetId,
      kind: body.kind,
      source: "in_app_still",
    });
    return NextResponse.json({ ref }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
