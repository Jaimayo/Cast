import { EmptyState } from "@/components/empty-state";
import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { StillPreview } from "@/components/still-preview";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireAttestedUser();
  const stills = await listLibraryStills(user.id);
  return (
    <section>
      <div className="kicker">Library</div>
      <h1>Your stills</h1>
      <p className="muted">Private in-app stills. Nothing is public.</p>
      {stills.length === 0 ? (
        <EmptyState
          kicker="Library"
          title="Nothing stored yet"
          body="Stills you generate in Create land here. Use them later as fictional reference pictures on a Character Pack."
          action={{ href: "/app/create", label: "Open Create" }}
        />
      ) : (
        <div className="contact-sheet">
          {stills.map((still) => (
            <div key={still.id} className="sheet-tile">
              <StillPreview src={still.previewUrl} alt="Your still" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
