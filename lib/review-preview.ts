export const DEFAULT_REVIEW_INVITE_CODE = "castreview";
export const REVIEW_INVITE_MAX_USES = 50;
export const REVIEW_INVITE_NOTE = "stub product-review";

/** Known invite for Stage 1 product review when PROVIDER_MODE=stub. */
export function stubReviewInviteCode(providerMode: string, envCode?: string): string | null {
  if (providerMode !== "stub") {
    return null;
  }
  const code = (envCode ?? DEFAULT_REVIEW_INVITE_CODE).trim();
  return code.length >= 4 ? code : DEFAULT_REVIEW_INVITE_CODE;
}
