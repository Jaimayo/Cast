import { ProviderNetworkError, ProviderTimeoutError } from "@/server/providers/types";

export const PROVIDER_FETCH_TIMEOUT_MS = 60_000;

export async function providerFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new ProviderTimeoutError();
    }
    throw new ProviderNetworkError(err);
  }
}
