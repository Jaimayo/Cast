import { getReadiness, readinessResponse } from "@/server/health";

export const dynamic = "force-dynamic";

/**
 * Readiness: Postgres, Redis, and BullMQ are reachable.
 * 200 = invite → train → generate can be accepted; 503 = at least one dep is down.
 */
export async function GET() {
  return readinessResponse(await getReadiness());
}
