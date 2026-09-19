import { NextResponse } from "next/server";
import { nextPathAfterAuth } from "@/lib/auth-entry";
import { ensureSessionMatchesUser, getCurrentUser, publicUser } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await ensureSessionMatchesUser(user);
    }
    return NextResponse.json({
      user: user ? publicUser(user) : null,
      next: nextPathAfterAuth(user),
    });
  } catch (err) {
    return jsonError(err);
  }
}
