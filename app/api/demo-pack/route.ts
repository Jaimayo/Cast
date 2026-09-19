import { NextResponse } from "next/server";
import { demoSeedPayload, shouldServeDemoPacks } from "@/lib/demo-pack";
import { requireAttestedUser } from "@/server/auth";
import { getEnv } from "@/server/env";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

function catalog() {
  if (!shouldServeDemoPacks({ providerMode: getEnv().providerMode })) {
    return NextResponse.json({ error: "Demo packs are stub review only." }, { status: 404 });
  }
  return NextResponse.json(demoSeedPayload());
}

export async function GET() {
  try {
    await requireAttestedUser();
    return catalog();
  } catch (err) {
    return jsonError(err);
  }
}

/** Idempotent. Catalog is the seed — drop fictional refs under public/demo/refs later. */
export async function POST() {
  try {
    await requireAttestedUser();
    return catalog();
  } catch (err) {
    return jsonError(err);
  }
}
