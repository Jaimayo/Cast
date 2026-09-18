import { cn } from "@/lib/utils";

export function VoidAtmosphere(props: { subtle?: boolean; className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", props.className)}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(circle_at_center,#c4a574_0.7px,transparent_0.8px)] bg-size-[22px_22px]",
          props.subtle ? "opacity-[0.035]" : "opacity-[0.07]",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-[linear-gradient(to_right,#1f1f2a_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2a_1px,transparent_1px)] bg-size-[72px_72px]",
          props.subtle ? "opacity-[0.12]" : "opacity-[0.22]",
        )}
      />
      <div
        className={cn(
          "absolute left-1/2 top-[18%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[140px]",
          props.subtle && "opacity-40 blur-[160px]",
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" />
    </div>
  );
}
