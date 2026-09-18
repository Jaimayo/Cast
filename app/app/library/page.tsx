import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { StillPreview } from "@/components/still-preview";
import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireAttestedUser();
  const stills = await listLibraryStills(user.id);
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Library</p>
      <h1 className="mt-1 font-heading text-4xl">Your stills</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        In-app stills only. No public gallery and no device face upload.
      </p>
      {stills.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Nothing stored yet.</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {stills.map((still) => (
          <div key={still.id} className="overflow-hidden rounded-[var(--radius-chip)] border border-border">
            {still.previewUrl ? (
              <StillPreview src={still.previewUrl} alt="Your still" className="still-thumb aspect-square w-full object-cover" />
            ) : (
              <PlaceholderThumb id={still.id} family="character" label="Still" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
