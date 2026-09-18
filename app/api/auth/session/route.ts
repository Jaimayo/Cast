import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user: user ? publicUser(user) : null });
  } catch (err) {
    return jsonError(err);
  }
}
