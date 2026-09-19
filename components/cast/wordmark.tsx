import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

/** Crop production 280×40 L1 to the mark + CAST (left ~145×40). */
const LOCKUP: Record<LogoSize, string> = {
  sm: "h-7 w-[102px]",
  md: "h-8 w-[116px]",
  lg: "h-12 w-[174px]",
};

/** Crop production 200×40 W1 to the tracked CAST (left ~96×40). */
const W1: Record<LogoSize, string> = {
  sm: "h-6 w-[58px]",
  md: "h-7 w-[67px]",
  lg: "h-9 w-[86px]",
};

/** F1 — simple rounded still-frame with center bar. */
export function CastMark(props: { className?: string }) {
  return (
    <img
      src="/brand/cast-mark-f1.svg"
      alt=""
      draggable={false}
      className={cn("select-none", props.className)}
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
      className={cn("select-none object-left object-cover", props.className)}
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
      className={cn(
        "select-none object-left object-cover",
        l1 ? LOCKUP[size] : W1[size],
        props.className,
      )}
    />
  );

  if (!props.href) {
    return (
      <span className="inline-flex" role="img" aria-label="Cast">
        {content}
      </span>
    );
  }

  return (
    <a href={props.href} className="inline-flex" aria-label="Cast">
      {content}
    </a>
  );
}
