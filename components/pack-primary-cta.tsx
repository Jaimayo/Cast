import { PACK_PRIMARY_CTA } from "@/lib/studio-copy";

export function PackPrimaryCta(props: { packId: string; className?: string }) {
  return (
    <a
      className={props.className ? `btn pack-primary-cta ${props.className}` : "btn pack-primary-cta"}
      href={`/app/create?pack=${props.packId}`}
    >
      {PACK_PRIMARY_CTA}
    </a>
  );
}
