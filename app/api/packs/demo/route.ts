import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
import { seedStubReviewPacks } from "@/server/demo-pack";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireAttestedUser();
    const result = await seedStubReviewPacks(user.id);
    return NextResponse.json({
      locked: result.locked,
      draft: result.draft,
    });
  } catch (err) {
    return jsonError(err);
  }
}
