"use client";

import { useState, type ReactNode } from "react";
import { StillPreview } from "@/components/still-preview";
import { cn } from "@/lib/utils";

export type ElasticTile = {
  id: string;
  src?: string | null;
  alt: string;
  label?: string;
  selected?: boolean;
};

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function ElasticRow(props: {
  items: ElasticTile[];
  onSelect?: (id: string) => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <div
      className="flex h-48 gap-2"
      onMouseLeave={() => setHoverId(null)}
    >
      {props.items.map((item) => {
        const expanded = item.selected || hoverId === item.id || props.items.length === 1;
        const Comp = props.onSelect ? "button" : "div";
        return (
          <Comp
            key={item.id}
            type={props.onSelect ? "button" : undefined}
            className={cn(
              "cast-ease relative min-w-0 overflow-hidden rounded-lg bg-muted text-left ring-1 ring-border",
              expanded ? "flex-[2.35]" : "flex-1",
              item.selected && "ring-2 ring-primary",
              props.onSelect && "cursor-pointer",
            )}
            style={{ flexBasis: 0 }}
            onMouseEnter={() => setHoverId(item.id)}
            onFocus={() => setHoverId(item.id)}
            onClick={props.onSelect ? () => props.onSelect?.(item.id) : undefined}
          >
            <StillPreview
              src={item.src}
              alt={item.alt}
              label={item.label}
              className="absolute inset-0 size-full object-cover"
            />
            <div
              className={cn(
                "cast-ease absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-2.5",
                expanded ? "opacity-100" : "opacity-0",
              )}
            >
              {item.label ? (
                <span className="inline-flex rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  {item.label}
                </span>
              ) : null}
            </div>
            {item.selected ? (
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                ✓
              </span>
            ) : null}
          </Comp>
        );
      })}
    </div>
  );
}

export function ElasticGallery(props: {
  items: ElasticTile[];
  onSelect?: (id: string) => void;
  empty?: ReactNode;
}) {
  if (props.items.length === 0) {
    return <>{props.empty ?? null}</>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 md:hidden">
        {props.items.map((item) => {
          const Comp = props.onSelect ? "button" : "div";
          return (
            <Comp
              key={item.id}
              type={props.onSelect ? "button" : undefined}
              className={cn(
                "relative overflow-hidden rounded-lg bg-muted p-0 text-left ring-1 ring-border",
                item.selected && "ring-2 ring-primary",
                props.onSelect && "cursor-pointer",
              )}
              onClick={props.onSelect ? () => props.onSelect?.(item.id) : undefined}
            >
              <StillPreview
                src={item.src}
                alt={item.alt}
                label={item.label}
                className="aspect-square w-full object-cover"
              />
              {item.selected ? (
                <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  ✓
                </span>
              ) : null}
              {item.label ? <span className="sr-only">{item.label}</span> : null}
            </Comp>
          );
        })}
      </div>
      <div className="hidden space-y-2 md:block">
        {chunk(props.items, 5).map((row) => (
          <ElasticRow key={row.map((item) => item.id).join("-")} items={row} onSelect={props.onSelect} />
        ))}
      </div>
    </div>
  );
}
