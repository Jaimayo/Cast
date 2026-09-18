import { CastMark } from "@/components/cast/wordmark";
import { StillPreview } from "@/components/still-preview";
import { Button } from "@/components/ui/button";
import { packDetailPath } from "@/lib/soul";

export function CharacterRequiredEmpty(props: { packId?: string | null; training?: boolean }) {
  return (
    <div className="hero-frame relative flex aspect-[3/4] w-full max-w-md items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
      <div className="cast-vignette absolute inset-0" />
      <div className="relative z-10 flex max-w-xs flex-col items-center px-6 text-center">
        <CastMark className="mb-5 h-12 w-9 opacity-80" />
        <h2 className="font-heading text-2xl">Lock a character to create</h2>
        <p className="mt-2 text-sm text-muted-foreground">Composer needs a Locked Soul ID.</p>
        {props.training ? <p className="mt-2 text-sm text-success">Training Soul ID…</p> : null}
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button asChild size="xl" variant="metallic">
            <a href="/app/characters">Go to Characters</a>
          </Button>
          <a
            href={packDetailPath(props.packId)}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Lock Soul ID first
          </a>
        </div>
      </div>
    </div>
  );
}

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
    <div className="hero-frame relative flex aspect-[3/4] w-full max-w-md items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
      <div className="cast-vignette pointer-events-none absolute inset-0 z-10" />
      {props.previewUrl ? (
        <StillPreview src={props.previewUrl} alt="Generated still" className="still-thumb h-full w-full object-cover" />
      ) : (
        <span className="relative z-10 px-8 text-center text-sm text-muted-foreground">
          {props.message ?? "Hero Frame still. Generate to fill this canvas."}
        </span>
      )}
    </div>
  );
}
