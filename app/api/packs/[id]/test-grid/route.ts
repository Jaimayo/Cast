import { NextResponse } from "next/server";
import { publicJob } from "@/lib/media";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { enqueueTestGrid } from "@/server/packs";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAttestedUser();
    const { id } = await context.params;
    const result = await enqueueTestGrid(user.id, id);
    return NextResponse.json({ ...result, jobs: result.jobs.map(publicJob) }, { status: 202 });
  } catch (err) {
    return jsonError(err);
  }
}
