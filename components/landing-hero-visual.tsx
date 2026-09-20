import { LANDING_CHIP_LABELS, LANDING_VISUAL_CAPTION, LANDING_VISUAL_NAMES } from "@/lib/landing-copy";

function FrameWatermark() {
  return (
    <svg className="landing-frame-mark" viewBox="0 0 72 52" aria-hidden="true" focusable="false">
      <rect
        x="4"
        y="6"
        width="64"
        height="40"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <rect x="24" y="24" width="24" height="4" rx="2" fill="currentColor" />
    </svg>
  );
}

export function LandingHeroVisual() {
  return (
    <div className="landing-visual">
      <div className="landing-visual-glow" aria-hidden="true" />
      <div className="landing-stack">
        <div className="landing-card is-back-2" aria-hidden="true" />
        <div className="landing-card is-back-1" aria-hidden="true" />
        <div className="landing-card is-front">
          <div className="landing-portrait">
            <FrameWatermark />
          </div>
          <p className="landing-visual-names">{LANDING_VISUAL_NAMES}</p>
          <p className="landing-visual-caption">{LANDING_VISUAL_CAPTION}</p>
        </div>
        <span className="landing-float-chip is-pose">{LANDING_CHIP_LABELS[0]}</span>
        <span className="landing-float-chip is-scene">{LANDING_CHIP_LABELS[1]}</span>
        <span className="landing-float-chip is-light">{LANDING_CHIP_LABELS[2]}</span>
      </div>
    </div>
  );
}
