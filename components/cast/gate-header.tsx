import { Wordmark } from "@/components/cast/wordmark";

export function GateHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
      <Wordmark href="/" size="sm" />
    </header>
  );
}
