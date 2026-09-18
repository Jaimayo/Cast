import { Progress } from "@/components/ui/progress";
import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";

export function RefCountMeter(props: { count: number }) {
  const pct = Math.min(100, Math.round((props.count / PACK_TARGET_REFS) * 100));
  const minPct = Math.round((PACK_MIN_REFS / PACK_TARGET_REFS) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 font-mono text-xs text-muted-foreground">
        <span>
          {props.count} / {PACK_TARGET_REFS}
        </span>
        <span>min {PACK_MIN_REFS}</span>
      </div>
      <div className="relative">
        <Progress value={pct} className="h-1.5 bg-muted" />
        <span
          className="pointer-events-none absolute top-0 h-1.5 w-px bg-foreground/40"
          style={{ left: `${minPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
