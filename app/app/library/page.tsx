import { listLibraryStills } from "@/server/packs";
import { requireAttestedUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireAttestedUser();
  const stills = await listLibraryStills(user.id);
  return (
    <section>
      <div className="kicker">Library</div>
      <h1>Your stills</h1>
      <p className="muted">In-app stills only. No public gallery and no device face upload.</p>
      {stills.length === 0 ? <p className="muted">Nothing stored yet.</p> : null}
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
    </section>
  );
}
