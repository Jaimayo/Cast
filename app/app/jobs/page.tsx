"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Job = {
  id: string;
  kind: string;
  status: string;
  provider: string;
  errorCode: string | null;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ jobs: Job[] }>("/api/jobs")
      .then((data) => setJobs(data.jobs))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load jobs"));
  }, []);

  return (
    <section>
      <div className="kicker">Queue</div>
      <h1>Jobs</h1>
      <p className="lede-sm">generateStill (Venice) and trainPack (RunPod) workers. Stub mode finishes locally.</p>
      {error ? <p className="error">{error}</p> : null}
      {jobs.length === 0 ? (
        <div className="empty-sheet">
          <p className="muted">No jobs yet. Lock a character, pick a pose, then Generate.</p>
        </div>
      ) : null}
      <table className="table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.kind}</td>
              <td>{job.status}</td>
              <td>{job.provider}</td>
              <td>{job.errorCode ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
