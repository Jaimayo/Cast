import { MetallicButton } from "@/components/metallic-button";
import { Button } from "@/components/ui/button";

function GeometricMark() {
  return (
    <svg viewBox="0 0 72 72" className="mx-auto size-14 text-primary/70" aria-hidden>
      <rect x="14" y="10" width="44" height="52" rx="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 54 L28 38 L40 48 L58 26" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="50" cy="24" r="3" fill="currentColor" />
    </svg>
  );
}

export function CharacterRequiredEmpty(props: { packId?: string | null; training?: boolean }) {
  const showLockLink = Boolean(props.packId);
  return (
    <div className="cast-vignette flex aspect-[3/4] w-full max-w-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <GeometricMark />
      <p className="mt-5 text-[11px] tracking-[0.16em] text-primary uppercase">Composer</p>
      <h2 className="mt-2 font-heading text-2xl">Lock Soul ID first</h2>
      <p className="mt-2 max-w-[32ch] text-sm text-muted-foreground">
        Generate needs a Locked character. Draft and training packs stay off the canvas.
      </p>
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row">
        <MetallicButton asChild>
          <a href="/app/characters">Go to Characters</a>
        </MetallicButton>
        {showLockLink ? (
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
            <a href={`/app/characters/${props.packId}`}>Lock Soul ID first</a>
          </Button>
        ) : null}
      </div>
      {props.training ? <p className="mt-3 text-sm text-success">Training Soul ID…</p> : null}
    </div>
  );
}
