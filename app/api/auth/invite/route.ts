import { NextResponse } from "next/server";
import { inviteRedeemBodySchema } from "@/lib/invite-status";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { authResponse, ensureSessionMatchesUser, getCurrentUser, redeemInvite } from "@/server/auth";
import { jsonError } from "@/server/http";
import { consumeInviteRedeemLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const existing = await getCurrentUser();
    if (existing) {
      await ensureSessionMatchesUser(existing);
      return NextResponse.json(authResponse(existing, { resumed: true }));
    }

    const body = inviteRedeemBodySchema.parse(await request.json());
    await consumeInviteRedeemLimit({
      email: body.email,
      ip: clientIpFromHeaders(request.headers),
    });
    const user = await redeemInvite(body);
    return NextResponse.json(authResponse(user));
  } catch (err) {
    return jsonError(err);
  }
}
