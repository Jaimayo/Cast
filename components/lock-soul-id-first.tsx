import { LOCK_SOUL_ID_FIRST, packDetailPath } from "@/lib/soul";

export function LockSoulIdFirstCta(props: {
  packId?: string | null;
  training?: boolean;
  /** Button (hero) vs inline text link (next to disabled Generate). */
  variant?: "button" | "link";
}) {
  const href = packDetailPath(props.packId);
  const label = LOCK_SOUL_ID_FIRST;
  return (
    <div className="lock-soul-cta">
      {props.training ? <p className="ok">Training Soul ID…</p> : null}
      {props.variant === "link" ? (
        <a href={href}>{label}</a>
      ) : (
        <a className="btn" href={href}>
          {label}
        </a>
      )}
    </div>
  );
}
