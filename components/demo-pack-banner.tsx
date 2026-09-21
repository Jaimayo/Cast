import {
  DEMO_LIBRARY_COPY,
  DEMO_PACK_DRAFT_COPY,
  DEMO_PACK_FICTIONAL_COPY,
  DEMO_PACK_LOCKED_COPY,
} from "@/lib/demo-pack";

export function DemoBadge(props: { label?: string }) {
  return <span className="demo-badge">{props.label ?? "Demo"}</span>;
}

export function DemoPackBanner(props: { state?: "locked" | "draft" | "library" }) {
  const body =
    props.state === "locked"
      ? DEMO_PACK_LOCKED_COPY
      : props.state === "draft"
        ? DEMO_PACK_DRAFT_COPY
        : props.state === "library"
          ? DEMO_LIBRARY_COPY
          : DEMO_PACK_FICTIONAL_COPY;
  return (
    <div className="banner demo-banner" role="status">
      {body}
    </div>
  );
}
