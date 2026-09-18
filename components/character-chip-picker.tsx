"use client";

import { packSwatch } from "@/lib/chip-visuals";
import { isLockedSoul, soulStatusLabel } from "@/lib/soul";

type Pack = { id: string; name: string; status: string };

export function CharacterChipPicker(props: {
  packs: Pack[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="chip-family character-picker">
      <h4>Character *</h4>
      <div className="character-thumb-row" role="listbox" aria-label="Character Pack">
        {props.packs.length === 0 ? (
          <a className="thumb-tile placeholder pack-tile" href="/app/characters">
            <span className="thumb-art pack-art">
              <span className="pack-letter">+</span>
            </span>
            <span className="thumb-label">Create a pack</span>
          </a>
        ) : null}
        {props.packs.map((pack) => {
          const locked = isLockedSoul(pack.status);
          const selected = props.value === pack.id;
          const swatch = packSwatch(pack.id);
          return (
            <button
              key={pack.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`thumb-tile pack-tile${selected ? " selected" : ""}${locked ? "" : " unlocked"}`}
              onClick={() => props.onChange(pack.id)}
            >
              <span
                className="thumb-art pack-art"
                style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
              >
                <span className="pack-letter">{pack.name.slice(0, 1).toUpperCase()}</span>
                {locked ? <span className="soul-dot" title="Locked Soul ID" /> : null}
                {selected ? <span className="thumb-check" aria-hidden>✓</span> : null}
              </span>
              <span className="thumb-label">{pack.name}</span>
              <span className="thumb-meta">{locked ? "Soul ID" : soulStatusLabel(pack.status)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
