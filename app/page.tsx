import { GateHeader } from "@/components/gate-header";

export default function LandingPage() {
  return (
    <>
      <GateHeader />
      <main>
        <section className="wrap hero landing-hero">
          <div className="landing-copy">
            <div className="kicker">Invite only · Adults only · Fictional characters</div>
            <h1>Private fictional studio for adults.</h1>
            <p className="lede">
              Cast is invite-only. Create a consistent fictional character, then direct stills with
              structured chips — no public gallery, no real-person likeness tools.
            </p>
            <div className="actions">
              <a className="btn" href="/invite">
                Enter with invite
              </a>
            </div>
            <p className="muted">No public gallery. Stills first.</p>
          </div>
          <div className="landing-preview" aria-hidden>
            <div className="preview-frame">
              <span className="preview-label">Hero Frame</span>
              <span className="preview-sub">Lock a Soul ID, then compose</span>
            </div>
            <div className="preview-chips">
              <span>Pose</span>
              <span>Outfit</span>
              <span>Scene</span>
              <span>Lighting</span>
            </div>
          </div>
        </section>
        <section className="wrap landing-points">
          <article className="card point-card">
            <div className="kicker">01</div>
            <h3>Gated</h3>
            <p>Invite code, then 18+ attestation. Studio chrome stays hidden until both are done.</p>
          </article>
          <article className="card point-card">
            <div className="kicker">02</div>
            <h3>Character first</h3>
            <p>Lock a fictional Soul ID before Generate. Draft and training packs cannot create stills.</p>
          </article>
          <article className="card point-card">
            <div className="kicker">03</div>
            <h3>Chips, not prompts</h3>
            <p>Pose, outfit, scene, lighting, body — visual thumbs. No camera, no Advanced, no raw prompt box.</p>
          </article>
        </section>
      </main>
    </>
  );
}
