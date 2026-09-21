import { LandingHeroVisual } from "@/components/landing-hero-visual";
import { Wordmark } from "@/components/wordmark";
import { LANDING_BADGES, LANDING_LOGIN_HREF } from "@/lib/landing-copy";

export default function LandingPage() {
  return (
    <div className="landing-screen">
      <LandingHeroVisual />
      <header className="landing-header">
        <Wordmark href="/" size="sm" />
        <a className="btn landing-login" href={LANDING_LOGIN_HREF}>
          Log in
        </a>
      </header>
      <main className="landing-copy-wrap">
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
            <a className="btn landing-cta" href="/invite">
              Enter with invite
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
