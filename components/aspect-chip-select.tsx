"use client";

import { STILL_ASPECTS, type StillAspectId } from "@/lib/still-aspect";

export function AspectChipSelect(props: {
  value: StillAspectId;
  onChange: (id: StillAspectId) => void;
}) {
  return (
    <div className="chip-family">
      <h4>Frame</h4>
      <div className="chips" role="group" aria-label="Still frame">
        {STILL_ASPECTS.map((aspect) => {
          const selected = props.value === aspect.id;
          return (
            <button
              key={aspect.id}
              type="button"
              className={selected ? "chip aspect-chip selected" : "chip aspect-chip"}
              aria-pressed={selected}
              onClick={() => props.onChange(aspect.id)}
            >
              <span className="aspect-chip-icon" style={{ aspectRatio: aspect.cssRatio }} aria-hidden />
              {aspect.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
