import { ElasticGallery } from "@/components/cast/elastic-gallery";
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
      <div className="mt-6">
        <ElasticGallery
          stills={stills.map((still) => ({ id: still.id, previewUrl: still.previewUrl, label: "Private still" }))}
        />
      </div>
    </section>
  );
}
