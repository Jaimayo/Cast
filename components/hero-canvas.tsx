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
        // eslint-disable-next-line @next/next/no-img-element
        <img className="still-thumb" src={props.previewUrl} alt="Generated still" />
      ) : (
        <span>{props.message ?? "Hero Frame still. Generate to fill this canvas."}</span>
      )}
    </div>
  );
}
