import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { listLibraryStills, listRefs, reorderRefs, setRefSelected } from "@/server/packs";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mediaAssetId: z.string().uuid(),
  selected: z.boolean().default(true),
  kind: z.enum(["face_ref", "body_ref", "still", "starter_face", "starter_body"]).default("still"),
  source: z.enum(["in_app_still", "generate_starter"]).default("in_app_still"),
  starterPresetId: z.string().optional(),
});

const orderSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
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
    const body = bodySchema.parse(await request.json());
    const result = await setRefSelected({
      userId: user.id,
      packId: id,
      mediaAssetId: body.mediaAssetId,
      selected: body.selected,
      kind: body.kind,
      source: body.source,
      starterPresetId: body.starterPresetId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const body = orderSchema.parse(await request.json());
    const result = await reorderRefs({
      userId: user.id,
      packId: id,
      mediaAssetIds: body.order,
    });
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
