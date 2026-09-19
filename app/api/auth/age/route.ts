import { NextResponse } from "next/server";
import { assertCompleteAgeAttest } from "@/lib/age-attest";
import { attestAge, authResponse, requireUser } from "@/server/auth";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

async function readAttestBody(request: Request): Promise<{ attested?: unknown; fictionalOnly?: unknown }> {
  try {
    const raw: unknown = await request.json();
    if (typeof raw === "object" && raw !== null) {
      return raw as { attested?: unknown; fictionalOnly?: unknown };
    }
  } catch {
    // Incomplete or non-JSON body is the same product deny as an unchecked box.
  }
  return {};
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertCompleteAgeAttest(await readAttestBody(request));
    const updated = await attestAge(user.id);
    return NextResponse.json(authResponse(updated));
  } catch (err) {
    return jsonError(err);
  }
}
