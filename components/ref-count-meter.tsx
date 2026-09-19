import { packRefMeterCopy } from "@/lib/pack-ref-upload";
import { PACK_TARGET_REFS } from "@/lib/constants";

export function RefCountMeter(props: { count: number }) {
  const pct = Math.min(100, Math.round((props.count / PACK_TARGET_REFS) * 100));
  return (
    <div className="meter">
      <div className="row-between">
        <span className="muted">{packRefMeterCopy(props.count)}</span>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
