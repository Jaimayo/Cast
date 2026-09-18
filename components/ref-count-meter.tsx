import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";

export function RefCountMeter(props: { count: number }) {
  const pct = Math.min(100, Math.round((props.count / PACK_TARGET_REFS) * 100));
  const minPct = Math.round((PACK_MIN_REFS / PACK_TARGET_REFS) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-sm tabular-nums text-foreground">
          {props.count} / {PACK_TARGET_REFS}
        </span>
        <span className="text-xs text-muted-foreground">
          {PACK_MIN_REFS} min · ~{PACK_TARGET_REFS} target
        </span>
      </div>
      <div className="relative">
        <Progress value={pct} className="h-1.5 bg-muted" />
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-foreground/45"
          style={{ left: `${minPct}%` }}
        />
      </div>
    </div>
  );
}
