"use client";

import { ChipThumbGrid, type ThumbChip } from "@/components/chip-thumb-grid";
import type { ChipFamily } from "@/lib/chips";

type Chip = ThumbChip;

export function ChipSelect(props: {
  title: string;
  family: ChipFamily;
  chips: Chip[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  required?: boolean;
  variant?: "thumbs" | "chips";
}) {
  if (props.variant !== "chips") {
    return (
      <ChipThumbGrid
        family={props.family}
        title={props.title}
        chips={props.chips}
        value={props.value}
        onChange={props.onChange}
        optional={props.optional}
        required={props.required}
      />
    );
  }

  return (
    <div className="chip-family">
      <h4>
        {props.title}
        {props.required ? " *" : ""}
      </h4>
      <div className="chips">
        {props.optional ? (
          <button
            type="button"
            className={props.value === "" ? "chip selected" : "chip"}
            onClick={() => props.onChange("")}
          >
            Unset
          </button>
        ) : null}
        {props.chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={props.value === chip.id ? "chip selected" : "chip"}
            onClick={() => props.onChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
