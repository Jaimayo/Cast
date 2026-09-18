import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, revokeInvite } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = paramsSchema.parse(await context.params);
    const invite = await revokeInvite(id);
    return NextResponse.json({ invite });
  } catch (err) {
    return jsonError(err);
  }
}
