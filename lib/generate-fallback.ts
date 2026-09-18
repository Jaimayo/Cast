import { classifyJobError } from "@/lib/job-errors";
import { ProviderNotConfiguredError } from "@/server/providers/types";

/**
 * Venice is the default stills path. Fall back to RunPod generate only when
 * Venice is unset or the error is transient — never on 4xx / no-image / chips.
 */
export function shouldFallbackGenerateStill(input: {
  primaryAdapterName: string;
  err: unknown;
  hasProviderJobId?: boolean;
}): boolean {
  if (input.hasProviderJobId) {
    return false;
  }
  if (input.primaryAdapterName !== "venice") {
    return false;
  }
  if (input.err instanceof ProviderNotConfiguredError) {
    return true;
  }
  return classifyJobError(input.err).retryable;
}
