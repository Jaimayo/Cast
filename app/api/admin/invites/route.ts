import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvite, listInvites, publicInvite, requireAdmin } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  note: z.string().max(200).optional(),
  maxUses: z.number().int().min(1).max(50).optional(),
  expiresAt: z.coerce.date().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const rows = await listInvites();
    return NextResponse.json({
      invites: rows.map(publicInvite),
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = createSchema.parse(await request.json());
    const invite = await createInvite({
      actorId: admin.id,
      note: body.note,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt,
    });
    return NextResponse.json({ invite }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
