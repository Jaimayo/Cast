import { ComposerShell } from "@/components/cast/composer-shell";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const { pack } = await searchParams;
  return <ComposerShell initialPackId={pack} />;
}
