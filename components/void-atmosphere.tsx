export function VoidAtmosphere(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`cast-void relative min-h-svh ${props.className ?? ""}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,transparent_40%,color-mix(in_srgb,var(--background)_72%,transparent)_100%)]"
      />
      <div className="relative">{props.children}</div>
    </div>
  );
}
