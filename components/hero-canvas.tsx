export function CharacterRequiredEmpty() {
  return (
    <div className="hero-frame">
      <div>
        <p>Create or select a Character Pack</p>
        <a className="btn" href="/app/characters">
          Characters
        </a>
      </div>
    </div>
  );
}

export function HeroCanvas(props: { locked: boolean; message?: string | null }) {
  if (!props.locked) {
    return <CharacterRequiredEmpty />;
  }
  return (
    <div className="hero-frame">
      {props.message ?? "Hero Frame still. Generate to fill this canvas."}
    </div>
  );
}
