import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { inviteCodes } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const db = getDb();
    const rows = await db
      .update(inviteCodes)
      .set({ revokedAt: new Date() })
      .where(eq(inviteCodes.id, id))
      .returning();
    const invite = rows[0];
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    return NextResponse.json({ invite: { id: invite.id, revokedAt: invite.revokedAt } });
  } catch (err) {
    return jsonError(err);
  }
}
