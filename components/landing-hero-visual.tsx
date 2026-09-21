import {
  LANDING_CHIP_LABELS,
  LANDING_HERO_SRC,
  LANDING_VISUAL_CAPTION,
  LANDING_VISUAL_NAMES,
} from "@/lib/landing-copy";

/**
 * Champagne card stack with the Locked primary (Jillian) 3:4 hero.
 * Pose / Scene / Lighting chips stay as landing polish — L1 lockup is unchanged.
 */
export function LandingHeroVisual() {
  return (
    <div className="landing-visual">
      <div className="landing-visual-stage">
        <div className="landing-visual-card is-back" aria-hidden="true" />
        <div className="landing-visual-card is-mid" aria-hidden="true" />
        <figure className="landing-visual-card is-front">
          {/* Public static drop — landing is pre-gate. Studio tiles still use /api/media. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LANDING_HERO_SRC} alt={`${LANDING_VISUAL_NAMES}, ${LANDING_VISUAL_CAPTION}`} />
          <figcaption className="landing-visual-caption-block">
            <span className="landing-visual-name">{LANDING_VISUAL_NAMES}</span>
            <span className="landing-visual-kicker">{LANDING_VISUAL_CAPTION}</span>
          </figcaption>
        </figure>
        {LANDING_CHIP_LABELS.map((label, index) => (
          <span key={label} className={`landing-chip landing-chip-${index}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
