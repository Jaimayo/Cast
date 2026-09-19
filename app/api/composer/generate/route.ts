import { NextResponse } from "next/server";
import { z } from "zod";
import { publicJob } from "@/lib/media";
import { STILL_ASPECT_IDS } from "@/lib/still-aspect";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { enqueueGenerateStill } from "@/server/packs";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  characterPackId: z.string().uuid(),
  poseChipId: z.string().min(1),
  outfitChipId: z.string().min(1).optional().nullable(),
  sceneChipId: z.string().min(1).optional().nullable(),
  lightingChipId: z.string().min(1).optional().nullable(),
  bodyChipId: z.string().min(1).optional().nullable(),
  aspectRatio: z.enum(STILL_ASPECT_IDS).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAttestedUser();
    const body = bodySchema.parse(await request.json());
    const result = await enqueueGenerateStill({
      userId: user.id,
      characterPackId: body.characterPackId,
      poseChipId: body.poseChipId,
      outfitChipId: body.outfitChipId,
      sceneChipId: body.sceneChipId,
      lightingChipId: body.lightingChipId,
      bodyChipId: body.bodyChipId,
      aspectRatio: body.aspectRatio,
    });
    return NextResponse.json({ ...result, job: publicJob(result.job) }, { status: 202 });
  } catch (err) {
    return jsonError(err);
  }
}
