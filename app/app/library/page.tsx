import { DemoPackBanner } from "@/components/demo-pack-banner";
import { EmptyState } from "@/components/empty-state";
import { LibrarySheet } from "@/components/library-sheet";
import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";
import {
  LIBRARY_DETAIL_EMPTY_BODY,
  LIBRARY_EMPTY_ACTION,
  LIBRARY_EMPTY_BODY,
  LIBRARY_EMPTY_HREF,
  LIBRARY_EMPTY_TITLE,
  LIBRARY_KICKER,
  LIBRARY_PRIVATE_COPY,
  LIBRARY_TITLE,
  toLibraryStillInput,
} from "@/lib/library-still";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireAttestedUser();
  const stills = (await listLibraryStills(user.id)).map((still) => toLibraryStillInput(still));
  const demo = stills.some((still) => still.demo);
  return (
    <section>
      <div className="kicker">{LIBRARY_KICKER}</div>
      <h1>{LIBRARY_TITLE}</h1>
      <p className="muted">{LIBRARY_PRIVATE_COPY}</p>
      {demo ? <DemoPackBanner state="library" /> : null}
      {stills.length === 0 ? (
        <EmptyState
          kicker={LIBRARY_KICKER}
          title={LIBRARY_EMPTY_TITLE}
          body={LIBRARY_EMPTY_BODY}
          action={{ href: LIBRARY_EMPTY_HREF, label: LIBRARY_EMPTY_ACTION }}
        />
      ) : (
        <>
          <p className="muted">{LIBRARY_DETAIL_EMPTY_BODY}</p>
          <LibrarySheet stills={stills} />
        </>
      )}
    </section>
  );
}
