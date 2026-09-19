import { StillPreview } from "@/components/still-preview";
import { CastMark } from "@/components/wordmark";
import { LockSoulIdFirstCta } from "@/components/lock-soul-id-first";
import { GENERATE_IN_PROGRESS_COPY } from "@/lib/generate-affordances";
import { composerHeroEmptyCopy, getStillAspect, type StillAspectId } from "@/lib/still-aspect";

function frameStyle(aspectRatio: StillAspectId | undefined): { aspectRatio: string } {
  return { aspectRatio: getStillAspect(aspectRatio ?? "3:4").cssRatio };
}

export function CharacterRequiredEmpty(props: {
  packId?: string | null;
  training?: boolean;
  aspectRatio?: StillAspectId;
}) {
  return (
    <div className="hero-frame empty-state" style={frameStyle(props.aspectRatio)}>
      <CastMark className="empty-state-mark" />
      <div>
        <h2>Lock a character to create</h2>
        <p className="muted">Composer needs a Locked Soul ID and a Pose. No camera. No raw prompt.</p>
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
  generating?: boolean;
  aspectRatio?: StillAspectId;
}) {
  const aspect = getStillAspect(props.aspectRatio ?? "3:4");
  const caption = (
    <p className="kicker hero-frame-caption" aria-live="polite">
      {aspect.label}
    </p>
  );
  if (!props.locked) {
    return (
      <>
        <CharacterRequiredEmpty packId={props.packId} training={props.training} aspectRatio={aspect.id} />
        {caption}
      </>
    );
  }
  return (
    <>
      <div className={props.generating ? "hero-frame is-loading" : "hero-frame"} style={frameStyle(aspect.id)}>
        {props.previewUrl ? (
          <>
            <StillPreview src={props.previewUrl} alt="Generated still" />
            {props.progress ? <p className="hero-progress">{props.progress}</p> : null}
          </>
        ) : (
          <span>
            {props.progress ??
              (props.generating
                ? GENERATE_IN_PROGRESS_COPY
                : (props.message ?? composerHeroEmptyCopy(aspect)))}
          </span>
        )}
        {props.generating && props.previewUrl ? (
          <div className="hero-generating" aria-live="polite">
            {props.progress ?? GENERATE_IN_PROGRESS_COPY}
          </div>
        ) : null}
      </div>
      {caption}
    </>
  );
}
