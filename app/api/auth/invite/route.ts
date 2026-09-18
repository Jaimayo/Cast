import { NextResponse } from "next/server";
import { z } from "zod";
import { publicUser, redeemInvite } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  inviteCode: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const user = await redeemInvite(body);
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return jsonError(err);
  }
}
