import { GateHeader } from "@/components/gate-header";
import { LandingHeroVisual } from "@/components/landing-hero-visual";
import { LANDING_BADGES } from "@/lib/landing-copy";

export default function LandingPage() {
  return (
    <>
      <GateHeader />
      <main>
        <section className="wrap landing-hero">
          <div className="landing-copy">
            <div className="landing-badges" aria-label={LANDING_BADGES.join(" · ")}>
              <span className="landing-badge">Invite only</span>
              <span className="landing-badge">Adults only</span>
              <span className="landing-badge">Consistent characters</span>
            </div>
            <h1>Private studio for all your imaginations.</h1>
            <p className="lede">
              Cast is invite-only. Create a consistent fictional character, then direct stills with
              structured chips.
            </p>
            <div className="actions">
              <a className="btn" href="/invite">
                Enter with invite
              </a>
            </div>
          </div>
          <LandingHeroVisual />
        </section>
      </main>
    </>
  );
}
