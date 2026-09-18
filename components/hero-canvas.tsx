import { CharacterRequiredEmpty } from "@/components/character-required-empty";

export function HeroCanvas(props: {
  locked: boolean;
  message?: string | null;
  selectedPackId?: string;
  stubMode?: boolean;
  onDemoSeeded?: (packId: string) => void;
}) {
  if (!props.locked) {
    return (
      <CharacterRequiredEmpty
        selectedPackId={props.selectedPackId}
        selectedPackLocked={false}
        stubMode={props.stubMode}
        onDemoSeeded={props.onDemoSeeded}
      />
    );
  }
  return (
    <div className="hero-frame live-frame">
      <div className="hero-still">
        <p className="hero-still-label">Hero Frame</p>
        <p>{props.message ?? "Generate a still to fill this canvas."}</p>
      </div>
    </div>
  );
}
