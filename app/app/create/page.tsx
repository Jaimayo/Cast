import { ComposerShell } from "@/components/composer-shell";
import { getEnv } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const { pack } = await searchParams;
  const stubMode = getEnv().providerMode === "stub";
  return <ComposerShell initialPackId={pack} stubMode={stubMode} />;
}
