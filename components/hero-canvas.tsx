import { StillPreview } from "@/components/still-preview";
import { CastMark } from "@/components/wordmark";
import { LockSoulIdFirstCta } from "@/components/lock-soul-id-first";
import { GENERATE_IN_PROGRESS_COPY } from "@/lib/generate-affordances";
import { getStillAspect, type StillAspectId } from "@/lib/still-aspect";
import {
  CHARACTER_REQUIRED_BODY,
  CHARACTER_REQUIRED_CTA,
  CHARACTER_REQUIRED_HREF,
  CHARACTER_REQUIRED_TITLE,
  COMPOSER_EMPTY_CANVAS_COPY,
} from "@/lib/studio-copy";

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
        <h2>{CHARACTER_REQUIRED_TITLE}</h2>
        <p className="muted">{CHARACTER_REQUIRED_BODY}</p>
        <a className="btn" href={CHARACTER_REQUIRED_HREF}>
          {CHARACTER_REQUIRED_CTA}
        </a>
        {props.packId || props.training ? (
          <LockSoulIdFirstCta packId={props.packId} training={props.training} variant="link" />
        ) : null}
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
      <div className="hero-stage">
        <CharacterRequiredEmpty packId={props.packId} training={props.training} aspectRatio={aspect.id} />
        {caption}
      </div>
    );
  }
  return (
    <div className="hero-stage">
      <div
        className={
          props.generating ? "hero-frame is-loading" : props.previewUrl ? "hero-frame" : "hero-frame is-empty"
        }
        style={frameStyle(aspect.id)}
      >
        {props.previewUrl ? (
          <>
            <StillPreview src={props.previewUrl} alt="Generated still" />
            {props.progress ? <p className="hero-progress">{props.progress}</p> : null}
          </>
        ) : (
          <div className="hero-empty-inner">
            <CastMark className="hero-empty-mark" />
            <p className="hero-empty-copy">
              {props.generating
                ? (props.progress ?? GENERATE_IN_PROGRESS_COPY)
                : COMPOSER_EMPTY_CANVAS_COPY}
            </p>
          </div>
        )}
        {props.generating && props.previewUrl ? (
          <div className="hero-generating" aria-live="polite">
            {props.progress ?? GENERATE_IN_PROGRESS_COPY}
          </div>
        ) : null}
      </div>
      {caption}
    </div>
  );
}
