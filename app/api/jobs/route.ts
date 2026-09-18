import { NextResponse } from "next/server";
import { requireAttestedUser } from "@/server/auth";
import { jsonError } from "@/server/http";
import { listJobs } from "@/server/packs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAttestedUser();
    const jobs = await listJobs(user.id);
    return NextResponse.json({ jobs });
  } catch (err) {
    return jsonError(err);
  }
}
