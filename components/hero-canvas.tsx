export function CharacterRequiredEmpty() {
  return (
    <div className="hero-frame">
      <div>
        <p>Lock a Character Pack (Soul ID), then pick a Pose</p>
        <a className="btn" href="/app/characters">
          Characters
        </a>
      </div>
    </div>
  );
}

export function HeroCanvas(props: {
  locked: boolean;
  message?: string | null;
  previewUrl?: string | null;
}) {
  if (!props.locked) {
    return <CharacterRequiredEmpty />;
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
