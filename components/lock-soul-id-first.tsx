import { LOCK_SOUL_ID_FIRST, packDetailPath } from "@/lib/soul";
import { CHARACTER_REQUIRED_CTA, CHARACTER_REQUIRED_HREF } from "@/lib/studio-copy";

export function LockSoulIdFirstCta(props: {
  packId?: string | null;
  training?: boolean;
  /** Button (hero) vs inline text link (next to disabled Generate). */
  variant?: "button" | "link";
}) {
  const packHref = packDetailPath(props.packId);
  const showLockLink = Boolean(props.packId) || Boolean(props.training);
  return (
    <div className="lock-soul-cta">
      {props.training ? <p className="ok">Training Soul ID…</p> : null}
      {props.variant === "link" ? (
        showLockLink ? (
          <a href={packHref}>{LOCK_SOUL_ID_FIRST}</a>
        ) : (
          <a href={CHARACTER_REQUIRED_HREF}>{CHARACTER_REQUIRED_CTA}</a>
        )
      ) : (
        <a className="btn" href={CHARACTER_REQUIRED_HREF}>
          {CHARACTER_REQUIRED_CTA}
        </a>
      )}
    </div>
  );
}
