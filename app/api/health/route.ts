import { livenessResponse, readinessResponse, getReadiness } from "@/server/health";

export const dynamic = "force-dynamic";

function wantsReadiness(request: Request): boolean {
  const url = new URL(request.url);
  const ready = url.searchParams.get("ready");
  const check = url.searchParams.get("check");
  return ready === "1" || ready === "true" || check === "ready";
}

/** Liveness (process up) by default. Pass `?ready=1` for dependency readiness. */
export async function GET(request: Request) {
  if (wantsReadiness(request)) {
    return readinessResponse(await getReadiness());
  }
  return livenessResponse();
}
