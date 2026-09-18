"use client";

import { PlaceholderThumb } from "@/components/cast/placeholder-thumb";
import { comingSoonLabel, type ThumbFamily } from "@/lib/chip-visuals";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Chip = { id: string; label: string };

export function ChipThumbGrid(props: {
  family: ThumbFamily;
  chips: Chip[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
}) {
  if (props.chips.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex aspect-square items-end rounded-[var(--radius-chip)] border border-dashed border-border bg-muted/40 p-2 text-xs text-muted-foreground"
          >
            {comingSoonLabel(props.family)}
          </div>
        ))}
      </div>
    );
  }

  const items: Array<{ id: string; label: string; unset?: boolean }> = props.optional
    ? [{ id: "", label: "Unset", unset: true }, ...props.chips]
    : props.chips;

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const ids = items.map((item) => item.id);
    const index = Math.max(0, ids.indexOf(props.value));
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      props.onChange(ids[(index + 1) % ids.length] ?? "");
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      props.onChange(ids[(index - 1 + ids.length) % ids.length] ?? "");
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
    }
  }

  return (
    <div
      role="listbox"
      aria-label="Chip options"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
    >
      {items.map((item) => {
        const selected = props.value === item.id;
        return (
          <button
            key={item.id || "unset"}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(
              "group relative overflow-hidden rounded-[var(--radius-chip)] border border-border bg-muted text-left transition-colors duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
              selected && "border-primary ring-2 ring-primary",
            )}
            onClick={() => props.onChange(item.id)}
          >
            {item.unset ? (
              <div className="aspect-square bg-[linear-gradient(180deg,#16161f,#0a0a0e)]" />
            ) : (
              <PlaceholderThumb id={item.id} family={props.family} label={item.label} />
            )}
            {selected ? (
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            ) : null}
            <span className="block truncate px-2 py-1.5 text-xs text-foreground/90">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
