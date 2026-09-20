import { GateHeader } from "@/components/gate-header";
import { LandingHeroVisual } from "@/components/landing-hero-visual";
import { LANDING_BADGES, LANDING_BODY, LANDING_CTA, LANDING_HEADLINE } from "@/lib/landing-copy";

export default function LandingPage() {
  return (
    <>
      <GateHeader />
      <main>
        <section className="wrap landing-hero">
          <div className="landing-copy">
            <div className="landing-badges">
              {LANDING_BADGES.map((badge) => (
                <span className="landing-badge" key={badge}>
                  {badge}
                </span>
              ))}
            </div>
            <h1>{LANDING_HEADLINE}</h1>
            <p className="lede">{LANDING_BODY}</p>
            <div className="actions">
              <a className="btn" href="/invite">
                {LANDING_CTA}
              </a>
            </div>
          </div>
          <LandingHeroVisual />
        </section>
      </main>
    </>
  );
}
