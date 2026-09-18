import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inviteCodes } from "@/db/schema";
import { createInvite, requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  note: z.string().max(200).optional(),
  maxUses: z.number().int().min(1).max(50).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const rows = await db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
    return NextResponse.json({
      invites: rows.map((row) => ({
        id: row.id,
        code: row.code,
        note: row.note,
        maxUses: row.maxUses,
        useCount: row.useCount,
        revokedAt: row.revokedAt,
        redeemedAt: row.redeemedAt,
        createdAt: row.createdAt,
      })),
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
    });
    return NextResponse.json({ invite }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
