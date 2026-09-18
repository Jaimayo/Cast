import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { StillPreview } from "@/components/still-preview";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireAttestedUser();
  const stills = await listLibraryStills(user.id);
  return (
    <section className="space-y-5">
      <p className="text-[11px] tracking-[0.16em] text-primary uppercase">Library</p>
      <h1 className="font-heading text-3xl">Your stills</h1>
      <p className="text-sm text-muted-foreground">
        In-app stills only. No public gallery and no device face upload.
      </p>
      {stills.length === 0 ? <p className="text-sm text-muted-foreground">Nothing stored yet.</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {stills.map((still) => (
          <div key={still.id} className="overflow-hidden rounded-lg ring-1 ring-border">
            <StillPreview src={still.previewUrl} alt="Your still" className="aspect-square w-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}
