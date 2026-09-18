import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireAttestedUser();
  const stills = await listLibraryStills(user.id);
  return (
    <section>
      <div className="kicker">Library</div>
      <h1>Your stills</h1>
      <p className="muted">In-app stills only. No public gallery and no device face upload.</p>
      {stills.length === 0 ? <p className="muted">Nothing stored yet.</p> : null}
      <div className="contact-sheet">
        {stills.map((still) => (
          <div key={still.id} className="sheet-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="still-thumb" src={still.previewUrl} alt="Your still" />
          </div>
        ))}
      </div>
    </section>
  );
}
