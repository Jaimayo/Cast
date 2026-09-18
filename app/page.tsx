export default function LandingPage() {
  return (
    <main>
      <section className="wrap hero">
        <div className="kicker">Invite only · Adults only · Fictional characters</div>
        <h1>Private stills. Persistent characters.</h1>
        <p className="lede">
          Cast is a password-gated studio for verified adults to compose fictional character stills.
          Select a Character Pack, then direct pose, wardrobe, scene, and light — no raw prompt box,
          no public gallery, no real-person likeness tools.
        </p>
        <div className="actions">
          <a className="btn" href="/invite">
            Redeem invite
          </a>
          <a className="btn secondary" href="/invite?mode=signin">
            Sign in
          </a>
        </div>
      </section>
      <section className="wrap grid-3" id="how">
        <article className="card">
          <h3>Character Pack</h3>
          <p>
            Build a Soul ID from in-app stills or generate-then-lock. Twelve refs minimum, about
            twenty to train. Real-face upload is not available.
          </p>
        </article>
        <article className="card">
          <h3>Structured composer</h3>
          <p>
            Chips compile into a hidden prompt. Character is required. Camera and Advanced controls
            stay out of Stage 1.
          </p>
        </article>
        <article className="card">
          <h3>Stills first</h3>
          <p>
            Perfect a hero frame before motion. Animate later is a Phase 1.5 teaser — clip generation
            is not shipping in this scaffold.
          </p>
        </article>
      </section>
    </main>
  );
}
