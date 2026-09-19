import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

/** Tight crop of production 280×40 L1 (content occupies the left ~147×40). */
const LOCKUP: Record<LogoSize, string> = {
  sm: "h-7 w-[103px]",
  md: "h-8 w-[118px]",
  lg: "h-12 w-[176px]",
};

const W1: Record<LogoSize, string> = {
  sm: "h-[18px] w-[67px]",
  md: "h-5 w-[74px]",
  lg: "h-8 w-[118px]",
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

/** W1 — tracked CAST with hairline underline. */
export function CastWordmark(props: { className?: string }) {
  return (
    <img
      src="/brand/cast-wordmark-w1-transparent.svg"
      alt=""
      draggable={false}
      className={cn("select-none", props.className)}
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
        "select-none",
        l1 ? "object-left object-cover" : "object-contain",
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
