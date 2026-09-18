import { GateHeader } from "@/components/gate-header";

export default function LandingPage() {
  return (
    <>
      <GateHeader />
      <main>
        <section className="wrap hero">
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
          <p className="muted">No public gallery.</p>
        </section>
      </main>
    </>
  );
}
