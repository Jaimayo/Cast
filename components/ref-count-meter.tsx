import { PACK_MIN_REFS, PACK_TARGET_REFS } from "@/lib/constants";

export function RefCountMeter(props: { count: number }) {
  const pct = Math.min(100, Math.round((props.count / PACK_TARGET_REFS) * 100));
  return (
    <div className="meter">
      <div className="row-between">
        <span className="muted">
          {props.count} selected · {PACK_MIN_REFS} min / ~{PACK_TARGET_REFS} target
        </span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
