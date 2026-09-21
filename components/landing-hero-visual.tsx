import {
  LANDING_HERO_SRC,
  LANDING_VISUAL_ARIA,
  LANDING_VISUAL_CAPTION,
  LANDING_VISUAL_NAMES,
} from "@/lib/landing-copy";

/**
 * Full-bleed Jillian hero (Ashley Madison first-card pattern).
 * Champagne-on-void overlay lives in page chrome — no card stack, no floating chips.
 */
export function LandingHeroVisual() {
  return (
    <div className="landing-visual" role="img" aria-label={LANDING_VISUAL_ARIA}>
      {/* Public static drop — landing is pre-gate. Studio tiles still use /api/media. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="landing-hero-photo" src={LANDING_HERO_SRC} alt="" />
      <div className="landing-hero-scrim" aria-hidden="true" />
      <p className="landing-credit">
        <span className="landing-visual-name">{LANDING_VISUAL_NAMES}</span>
        <span className="landing-visual-kicker">{LANDING_VISUAL_CAPTION}</span>
      </p>
    </div>
  );
}
