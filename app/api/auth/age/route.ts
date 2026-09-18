import { NextResponse } from "next/server";
import { z } from "zod";
import { attestAge, publicUser, requireUser } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  attested: z.literal(true),
  fictionalOnly: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    bodySchema.parse(await request.json());
    const updated = await attestAge(user.id);
    return NextResponse.json({ user: publicUser(updated) });
  } catch (err) {
    return jsonError(err);
  }
}
