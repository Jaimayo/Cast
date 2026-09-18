import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const statusBadgeVariants = cva(
  "inline-flex h-7 max-w-full items-center overflow-hidden rounded-full border text-[11px] font-medium tracking-wide whitespace-nowrap",
  {
    variants: {
      status: {
        success:
          "border-[color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[color-mix(in_srgb,var(--success)_82%,var(--foreground))]",
        error: "border-destructive/40 bg-destructive/10 text-destructive",
        muted: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "muted",
    },
  },
);

export type StatusBadgeStatus = NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>;

export function StatusBadge({
  className,
  status = "muted",
  leftIcon,
  rightIcon,
  leftLabel,
  rightLabel,
  title,
}: {
  className?: string;
  status?: StatusBadgeStatus;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftLabel: string;
  rightLabel?: string;
  title?: string;
}) {
  return (
    <span data-slot="status-badge" title={title} className={cn(statusBadgeVariants({ status }), className)}>
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5">
        {leftIcon ? <span className="inline-flex size-3.5 items-center justify-center [&_svg]:size-3.5">{leftIcon}</span> : null}
        {leftLabel}
      </span>
      {rightLabel ? (
        <>
          <span aria-hidden className="h-full w-px self-stretch bg-current opacity-25" />
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5">
            {rightLabel}
            {rightIcon ? (
              <span className="inline-flex size-3.5 items-center justify-center [&_svg]:size-3.5">{rightIcon}</span>
            ) : null}
          </span>
        </>
      ) : null}
    </span>
  );
}

export { statusBadgeVariants };
