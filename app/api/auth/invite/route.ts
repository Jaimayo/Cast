import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { publicUser, redeemInvite } from "@/server/auth";
import { jsonError } from "@/server/http";
import { consumeInviteRedeemLimit } from "@/server/rate-limit";
import { ensureStubReviewInvite } from "@/server/review-bootstrap";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  inviteCode: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    await consumeInviteRedeemLimit({
      email: body.email,
      ip: clientIpFromHeaders(request.headers),
    });
    try {
      await ensureStubReviewInvite();
    } catch {
      // Redeem still runs; missing DB/env surfaces as an invite error.
    }
    const user = await redeemInvite(body);
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return jsonError(err);
  }
}
