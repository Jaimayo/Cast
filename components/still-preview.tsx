export function StillPreview(props: {
  src?: string | null;
  alt: string;
  label?: string;
}) {
  if (!props.src) {
    return (
      <div className="still-fallback">
        <strong>{props.alt}</strong>
        {props.label ? <div className="muted">{props.label}</div> : null}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="still-thumb" src={props.src} alt={props.alt} />
  );
}
