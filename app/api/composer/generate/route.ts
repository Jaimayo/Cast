import { NextResponse } from "next/server";
import { z } from "zod";
import { publicJob } from "@/lib/media";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { enqueueGenerateStill } from "@/server/packs";

export const dynamic = "force-dynamic";

const optionalChipId = z.string().optional().nullable();

const bodySchema = z.object({
  characterPackId: z.string().uuid(),
  poseChipId: optionalChipId,
  outfitChipId: optionalChipId,
  sceneChipId: optionalChipId,
  lightingChipId: optionalChipId,
  bodyChipId: optionalChipId,
});

export async function POST(request: Request) {
  try {
    const user = await requireAttestedUser();
    const body = bodySchema.parse(await request.json());
    const result = await enqueueGenerateStill({
      userId: user.id,
      characterPackId: body.characterPackId,
      poseChipId: body.poseChipId ?? "",
      outfitChipId: body.outfitChipId,
      sceneChipId: body.sceneChipId,
      lightingChipId: body.lightingChipId,
      bodyChipId: body.bodyChipId,
    });
    return NextResponse.json({ ...result, job: publicJob(result.job) }, { status: 202 });
  } catch (err) {
    return jsonError(err);
  }
}
