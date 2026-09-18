import { cn } from "@/lib/utils";

export function CastMark(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 40"
      className={cn("text-primary", props.className)}
      aria-hidden
    >
      <rect
        x="3.5"
        y="3.5"
        width="25"
        height="33"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect x="8" y="8" width="16" height="12" rx="1" fill="currentColor" opacity="0.18" />
      <circle cx="16" cy="26" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Wordmark(props: { href?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const size = props.size ?? "md";
  const content = (
    <span className={cn("inline-flex items-center gap-2 text-foreground", props.className)}>
      <CastMark
        className={cn(size === "lg" ? "h-8 w-6" : size === "sm" ? "h-5 w-4" : "h-6 w-5")}
      />
      <span
        className={cn(
          "font-heading tracking-tight",
          size === "lg" ? "text-4xl md:text-5xl" : size === "sm" ? "text-lg" : "text-xl",
        )}
      >
        Cast
      </span>
    </span>
  );

  if (!props.href) return content;
  return (
    <a href={props.href} className="inline-flex">
      {content}
    </a>
  );
}
