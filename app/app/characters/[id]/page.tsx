import { PackStatusPanel } from "@/components/pack-status-panel";
import { PackWizard } from "@/components/pack-wizard";
import { countRefs, getPack, listJobs, listRefs } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { toPublicPack } from "@/server/demo-pack";
import { mergeTestGridJobs } from "@/lib/test-grid";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAttestedUser();
  const { id } = await params;
  const pack = await getPack(user.id, id);
  if (!pack) notFound();
  const [refCount, refs, jobs] = await Promise.all([
    countRefs(pack.id),
    listRefs(user.id, pack.id),
    listJobs(user.id),
  ]);

  if (pack.status === "draft" || pack.status === "failed") {
    return <PackWizard initialPackId={pack.id} />;
  }

  const gridJobs = mergeTestGridJobs([], jobs, pack.id).map((job) => ({
    ...job,
    createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
  }));

  return (
    <PackStatusPanel pack={toPublicPack(pack)} refCount={refCount} refs={refs} initialGridJobs={gridJobs} />
  );
}
