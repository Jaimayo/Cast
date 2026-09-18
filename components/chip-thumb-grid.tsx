"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChipFamily } from "@/lib/chips";
import { chipSwatch, emptyCatalogCopy } from "@/lib/chip-visuals";
import { cn } from "@/lib/utils";

export type ThumbChip = { id: string; label: string };

const PLACEHOLDER_COUNT = 6;

export function ChipThumbGrid(props: {
  family: ChipFamily;
  title: string;
  chips: ThumbChip[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  required?: boolean;
  compact?: boolean;
}) {
  const items = useMemo(() => {
    const rows: Array<{ id: string; label: string; placeholder?: boolean }> = [];
    if (props.optional) {
      rows.push({ id: "", label: "Unset" });
    }
    if (props.chips.length === 0) {
      for (let i = 0; i < PLACEHOLDER_COUNT; i += 1) {
        rows.push({
          id: `__empty-${i}`,
          label: emptyCatalogCopy(props.family),
          placeholder: true,
        });
      }
    } else {
      rows.push(...props.chips);
    }
    return rows;
  }, [props.chips, props.family, props.optional]);

  const [focusId, setFocusId] = useState(props.value || items[0]?.id || "");
  const gridRef = useRef<HTMLDivElement>(null);

  const select = useCallback(
    (id: string, placeholder?: boolean) => {
      if (placeholder) return;
      props.onChange(id);
    },
    [props.onChange],
  );

  useEffect(() => {
    if (props.value) setFocusId(props.value);
  }, [props.value]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const cols = columnCount(gridRef.current);
    const index = items.findIndex((item) => item.id === focusId);
    const current = index < 0 ? 0 : index;
    let next = current;
    if (event.key === "ArrowRight") next = Math.min(items.length - 1, current + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
    else if (event.key === "ArrowDown") next = Math.min(items.length - 1, current + cols);
    else if (event.key === "ArrowUp") next = Math.max(0, current - cols);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = items[current];
      if (item) select(item.id, item.placeholder);
      return;
    } else {
      return;
    }
    event.preventDefault();
    const item = items[next];
    if (!item) return;
    setFocusId(item.id);
    const node = event.currentTarget.querySelector<HTMLButtonElement>(
      `[data-chip-id="${CSS.escape(item.id)}"]`,
    );
    node?.focus();
  }

  return (
    <div>
      <h4 className="mb-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {props.title}
        {props.required ? <span className="text-primary"> *</span> : null}
        {props.optional ? <span className="font-normal normal-case tracking-normal"> optional</span> : null}
      </h4>
      <div
        ref={gridRef}
        className={cn("grid gap-2", props.compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4")}
        role="listbox"
        aria-label={props.title}
        aria-required={props.required || undefined}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const selected = !item.placeholder && props.value === item.id;
          const swatch = chipSwatch(props.family, item.id || "unset");
          return (
            <button
              key={item.id || "unset"}
              type="button"
              role="option"
              data-chip-id={item.id}
              aria-selected={selected}
              disabled={item.placeholder}
              tabIndex={focusId === item.id ? 0 : -1}
              className={cn(
                "cast-ease group flex flex-col gap-1.5 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring",
                item.placeholder && "opacity-50",
              )}
              onClick={() => select(item.id, item.placeholder)}
              onFocus={() => setFocusId(item.id)}
            >
              <span
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md ring-1 ring-border",
                  selected && "ring-2 ring-primary",
                )}
                style={{ background: `linear-gradient(152deg, ${swatch.from}, ${swatch.to})` }}
              >
                <ChipGlyph family={props.family} unset={item.id === ""} />
                {selected ? (
                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    ✓
                  </span>
                ) : null}
              </span>
              <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground group-hover:text-foreground">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function columnCount(grid: HTMLDivElement | null): number {
  if (!grid) return 3;
  const styles = window.getComputedStyle(grid);
  const columns = styles.gridTemplateColumns.split(" ").filter(Boolean);
  return Math.max(1, columns.length);
}

function ChipGlyph(props: { family: ChipFamily; unset?: boolean }) {
  const className = "absolute inset-0 m-auto size-8 text-foreground/70";
  if (props.unset) {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <path d="M14 24h20" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (props.family === "pose") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <circle cx="24" cy="11" r="4.2" fill="currentColor" opacity="0.85" />
        <path
          d="M24 16.5 L24 29 M24 19 L16 24 M24 19 L32 23 M24 29 L18 39 M24 29 L30 39"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  if (props.family === "outfit") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <path
          d="M16 14 L24 18 L32 14 L35 20 L31 22 L31 38 L17 38 L17 22 L13 20 Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path d="M20 18.5 C22 22 26 22 28 18.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  if (props.family === "scene") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <rect x="10" y="12" width="28" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 30 L20 22 L28 28 L38 18" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="33" cy="17" r="2.2" fill="currentColor" />
      </svg>
    );
  }
  if (props.family === "lighting") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <circle cx="24" cy="22" r="6" fill="currentColor" opacity="0.8" />
        <path
          d="M24 10v4 M24 30v4 M12 22h4 M32 22h4 M15 13l2.5 2.5 M30.5 28.5 33 31 M15 31l2.5-2.5 M30.5 15.5 33 13"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <ellipse cx="24" cy="32" rx="9" ry="6" fill="currentColor" opacity="0.45" />
      <path d="M18 18 C18 12 30 12 30 18 C30 28 18 28 18 18 Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
