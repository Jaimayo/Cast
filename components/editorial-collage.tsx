function FrameMark(props: { kind: "canvas" | "pose" | "scene" | "outfit" | "light" }) {
  const className = "size-full text-foreground/70";
  if (props.kind === "canvas") {
    return (
      <svg viewBox="0 0 72 96" className={className} aria-hidden>
        <rect x="10" y="8" width="52" height="80" rx="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 72 L28 50 L42 64 L62 34" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="52" cy="30" r="3.2" fill="currentColor" />
      </svg>
    );
  }
  if (props.kind === "pose") {
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
  if (props.kind === "scene") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <rect x="10" y="12" width="28" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 30 L20 22 L28 28 L38 18" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="33" cy="17" r="2.2" fill="currentColor" />
      </svg>
    );
  }
  if (props.kind === "outfit") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden>
        <path
          d="M16 14 L24 18 L32 14 L35 20 L31 22 L31 38 L17 38 L17 22 L13 20 Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="22" r="6" fill="currentColor" opacity="0.8" />
      <path
        d="M24 10v4 M24 30v4 M12 22h4 M32 22h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChipTile(props: { label: string; kind: "pose" | "scene" | "outfit" | "light"; className?: string }) {
  return (
    <div className={`cast-surface overflow-hidden rounded-lg p-2 ${props.className ?? ""}`}>
      <div className="aspect-square rounded-md bg-muted/80 p-2">
        <FrameMark kind={props.kind} />
      </div>
      <p className="mt-1.5 text-center text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{props.label}</p>
    </div>
  );
}

export function EditorialCollage() {
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-lg">
      <div
        aria-hidden
        className="absolute inset-10 rounded-[2rem] bg-[color-mix(in_srgb,var(--primary)_12%,var(--accent))] blur-3xl"
      />
      <div className="cast-vignette absolute top-2 right-16 bottom-20 left-4 rotate-[-2.5deg] overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex h-full flex-col p-4">
          <p className="text-[10px] tracking-[0.16em] text-primary uppercase">Hero frame</p>
          <div className="mt-3 flex-1 rounded-lg border border-dashed border-border bg-muted/40 p-6">
            <FrameMark kind="canvas" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Geometric still · no photography</p>
        </div>
      </div>
      <ChipTile label="Pose" kind="pose" className="absolute top-16 right-0 w-[6.5rem] rotate-[7deg]" />
      <ChipTile label="Scene" kind="scene" className="absolute bottom-8 right-10 w-[5.75rem] rotate-[-5deg]" />
      <ChipTile label="Light" kind="light" className="absolute bottom-16 left-0 w-[5.25rem] rotate-[8deg]" />
      <div className="cast-surface absolute right-4 bottom-0 hidden w-40 rounded-xl p-2 sm:block">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
          <div className="space-y-1">
            <div className="aspect-square rounded-sm bg-muted" />
            <div className="aspect-square rounded-sm bg-muted/80" />
            <div className="aspect-square rounded-sm bg-muted/60" />
          </div>
          <div className="aspect-[3/4] rounded-md border border-dashed border-border bg-muted/30 p-1.5">
            <FrameMark kind="canvas" />
          </div>
        </div>
      </div>
    </div>
  );
}
