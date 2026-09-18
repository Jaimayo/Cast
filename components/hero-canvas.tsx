import { StillPreview } from "@/components/still-preview";
import { CharacterRequiredEmpty } from "@/components/character-required-empty";

export function HeroCanvas(props: {
  locked: boolean;
  message?: string | null;
  previewUrl?: string | null;
  packId?: string | null;
  training?: boolean;
}) {
  if (!props.locked) {
    return <CharacterRequiredEmpty packId={props.packId} training={props.training} />;
  }
  return (
    <div className="cast-vignette flex aspect-[3/4] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
      {props.previewUrl ? (
        <StillPreview src={props.previewUrl} alt="Generated still" className="size-full object-cover" />
      ) : (
        <span className="px-8 text-center text-sm text-muted-foreground">
          {props.message ?? "Hero Frame still. Generate to fill this canvas."}
        </span>
      )}
    </div>
  );
}
