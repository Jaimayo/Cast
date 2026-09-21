import { LANDING_HERO_SRC } from "@/lib/landing-copy";

/**
 * Full-bleed Jillian hero (Ashley Madison first-card pattern).
 * Champagne-on-void overlay lives in page chrome — no card stack, no floating chips, no caption.
 */
export function LandingHeroVisual() {
  return (
    <div className="landing-visual">
      {/* Public static drop — landing is pre-gate. Studio tiles still use /api/media. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="landing-hero-photo" src={LANDING_HERO_SRC} alt="" />
      <div className="landing-hero-scrim" aria-hidden="true" />
    </div>
  );
}
