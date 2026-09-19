type LogoSize = "sm" | "md" | "lg";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

/** F1 — simple rounded still-frame with center bar. */
export function CastMark(props: { className?: string }) {
  return (
    <img
      src="/brand/cast-mark-f1.svg"
      alt=""
      draggable={false}
      className={cx("cast-mark", props.className)}
    />
  );
}

/** W1 — tracked CAST wordmark. */
export function CastWordmark(props: { className?: string }) {
  return (
    <img
      src="/brand/cast-wordmark-w1-transparent.svg"
      alt=""
      draggable={false}
      className={cx("cast-w1", props.className)}
    />
  );
}

/** L1 lockup, or W1 in narrow chrome. Files live in public/brand/. */
export function Wordmark(props: {
  href?: string;
  className?: string;
  size?: LogoSize;
  variant?: "l1" | "w1";
}) {
  const size = props.size ?? "md";
  const variant = props.variant ?? "l1";
  const l1 = variant === "l1";
  const content = (
    <img
      src={l1 ? "/brand/cast-lockup-l1-transparent.svg" : "/brand/cast-wordmark-w1-transparent.svg"}
      alt=""
      draggable={false}
      className={cx(l1 ? "cast-lockup" : "cast-w1", `is-${size}`, props.className)}
    />
  );

  if (!props.href) {
    return (
      <span className="cast-brand" role="img" aria-label="Cast">
        {content}
      </span>
    );
  }

  return (
    <a href={props.href} className="cast-brand" aria-label="Cast">
      {content}
    </a>
  );
}
