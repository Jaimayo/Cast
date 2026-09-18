import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { ElasticGallery } from "@/components/elastic-gallery";

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
      <ElasticGallery
        items={stills.map((still) => ({
          id: still.id,
          src: still.previewUrl,
          alt: "Your still",
          label: "Still",
        }))}
        empty={<p className="text-sm text-muted-foreground">Nothing stored yet.</p>}
      />
    </section>
  );
}
