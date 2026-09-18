import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireAttestedUser();
  const stills = await listLibraryStills(user.id);
  return (
    <section className="page-section">
      <div className="kicker">Library</div>
      <h1>Your stills</h1>
      <p className="lede-sm">In-app stills only. No public gallery and no device face upload.</p>
      {stills.length === 0 ? (
        <div className="empty-sheet">
          <p className="muted">Nothing stored yet. Generate from Create after you lock a Soul ID.</p>
          <a className="btn secondary" href="/app/create">
            Go to Create
          </a>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Kind</th>
            </tr>
          </thead>
          <tbody>
            {stills.map((still) => (
              <tr key={still.id}>
                <td>{still.storageKey}</td>
                <td>{still.kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
