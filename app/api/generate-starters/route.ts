import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { enqueueGenerateStarter } from "@/server/packs";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  characterPackId: z.string().uuid(),
  presetId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireAttestedUser();
    const body = bodySchema.parse(await request.json());
    const result = await enqueueGenerateStarter({
      userId: user.id,
      characterPackId: body.characterPackId,
      presetId: body.presetId,
    });
    return NextResponse.json(
      { job: result.job, preset: { id: result.preset.id, kind: result.preset.kind, label: result.preset.label } },
      { status: 202 },
    );
  } catch (err) {
    return jsonError(err);
  }
}
