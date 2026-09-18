"use client";

type Chip = { id: string; label: string };

export function ChipSelect(props: {
  title: string;
  chips: Chip[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  required?: boolean;
}) {
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
