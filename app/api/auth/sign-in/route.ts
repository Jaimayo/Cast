import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, ensureSessionMatchesUser, getCurrentUser, signIn } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const existing = await getCurrentUser();
    if (existing) {
      await ensureSessionMatchesUser(existing);
      return NextResponse.json(authResponse(existing, { resumed: true }));
    }
    const body = bodySchema.parse(await request.json());
    const user = await signIn(body);
    return NextResponse.json(authResponse(user));
  } catch (err) {
    return jsonError(err);
  }
}
