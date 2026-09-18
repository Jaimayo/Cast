import { cn } from "@/lib/utils";

type StatusTone = "success" | "muted" | "warning" | "error";

const DOT: Record<StatusTone, string> = {
  success: "bg-success",
  muted: "bg-muted-foreground",
  warning: "bg-primary",
  error: "bg-destructive",
};

/** Tremor-inspired split status pill — remixed to champagne-on-void. */
export function StatusBadge(props: {
  left: string;
  right?: string;
  status?: StatusTone;
  pulse?: boolean;
  className?: string;
}) {
  const status = props.status ?? "muted";
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center overflow-hidden whitespace-nowrap rounded-full border border-border bg-card text-xs",
        props.className,
      )}
    >
      <span className="px-2.5 py-0.5 text-muted-foreground">{props.left}</span>
      {props.right ? (
        <>
          <span className="h-3.5 w-px bg-border" aria-hidden />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-foreground">
            <span
              className={cn("size-1.5 rounded-full", DOT[status], props.pulse && "animate-pulse")}
            />
            {props.right}
          </span>
        </>
      ) : null}
    </span>
  );
}
