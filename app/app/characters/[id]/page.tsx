import { PackStatusPanel } from "@/components/pack-status-panel";
import { PackWizard } from "@/components/pack-wizard";
import { publicPack } from "@/lib/media";
import { countRefs, getPack } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAttestedUser();
  const { id } = await params;
  const pack = await getPack(user.id, id);
  if (!pack) notFound();
  const refCount = await countRefs(pack.id);

  if (pack.status === "draft" || pack.status === "failed") {
    return <PackWizard initialPackId={pack.id} />;
  }

  return <PackStatusPanel pack={publicPack(pack)} refCount={refCount} />;
}
