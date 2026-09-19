import { StillPreview } from "@/components/still-preview";
import { LockSoulIdFirstCta } from "@/components/lock-soul-id-first";

export function CharacterRequiredEmpty(props: { packId?: string | null; training?: boolean }) {
  return (
    <div className="hero-frame">
      <div>
        <LockSoulIdFirstCta packId={props.packId} training={props.training} />
      </div>
    </div>
  );
}

export function HeroCanvas(props: {
  locked: boolean;
  message?: string | null;
  progress?: string | null;
  previewUrl?: string | null;
  packId?: string | null;
  training?: boolean;
}) {
  if (!props.locked) {
    return <CharacterRequiredEmpty packId={props.packId} training={props.training} />;
  }
  return (
    <div className="hero-frame">
      {props.previewUrl ? (
        <>
          <StillPreview src={props.previewUrl} alt="Generated still" />
          {props.progress ? <p className="hero-progress">{props.progress}</p> : null}
        </>
      ) : (
        <span>{props.progress ?? props.message ?? "Hero Frame still. Generate to fill this canvas."}</span>
      )}
    </div>
  );
}
