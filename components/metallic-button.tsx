import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

type MetallicButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  size?: "default" | "lg";
};

export function MetallicButton({
  className,
  asChild = false,
  size = "default",
  ...props
}: MetallicButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="metallic-button"
      className={cn(
        "cast-metal cast-ease inline-flex shrink-0 items-center justify-center gap-1.5 border border-transparent font-medium whitespace-nowrap outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none",
        size === "default" && "h-11 rounded-full px-6 text-sm",
        size === "lg" && "h-12 rounded-full px-7 text-sm",
        className,
      )}
      {...props}
    />
  );
}
