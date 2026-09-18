"use client";

type Tile = {
  id: string;
  presetId: string | null;
  vibeKind: string;
  selected: boolean;
};

export function ContactSheet(props: {
  tiles: Tile[];
  onToggle: (id: string, selected: boolean, vibeKind: string, presetId: string | null) => void;
}) {
  if (props.tiles.length === 0) {
    return <p className="muted">No starter stills yet. Generate face or body vibes above.</p>;
  }
  return (
    <div className="contact-sheet">
      {props.tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={tile.selected ? "sheet-tile selected" : "sheet-tile"}
          onClick={() => props.onToggle(tile.id, !tile.selected, tile.vibeKind, tile.presetId)}
        >
          <strong>{tile.vibeKind}</strong>
          <div className="muted">{tile.presetId ?? "starter"}</div>
          <div className="muted">{tile.selected ? "Selected" : "Tap to select"}</div>
        </button>
      ))}
    </div>
  );
}
