"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Job = {
  id: string;
  kind: string;
  status: string;
  provider: string;
  errorCode: string | null;
  errorMessage: string | null;
  previewUrl?: string | null;
};

function statusLabel(status: string): string {
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "succeeded") return "Succeeded";
  if (status === "failed") return "Failed";
  if (status === "canceled") return "Canceled";
  return status;
}

function errorLabel(job: Job): string {
  return job.errorMessage || job.errorCode || "—";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<{ jobs: Job[] }>("/api/jobs");
        if (!cancelled) setJobs(data.jobs);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load jobs");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section>
      <div className="kicker">Queue</div>
      <h1>Jobs</h1>
      <p className="muted">
        generateStill uses Venice unless the pack has a locked Soul ID adapter — then RunPod. trainPack is
        RunPod. Stub mode never calls vendors.
      </p>
      <p className="muted">
        Failed stills: generate again from Create. Failed starters: generate the vibe again. Failed training:
        open the character and Train & lock or Retrain. Retrain keeps the previous Locked Soul ID if the new
        train fails.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Preview</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.kind}</td>
              <td>{statusLabel(job.status)}</td>
              <td>{job.provider}</td>
              <td>
                {job.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="still-thumb job-thumb" src={job.previewUrl} alt="" />
                ) : (
                  "—"
                )}
              </td>
              <td>
                {errorLabel(job)}
                {job.errorMessage && job.errorCode ? <div className="muted">{job.errorCode}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
