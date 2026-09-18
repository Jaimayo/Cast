"use client";

import { useEffect, useState } from "react";
import { StillPreview } from "@/components/still-preview";
import { api } from "@/lib/client";
import { formatJobAge, formatJobAttempts, type PublicJob } from "@/lib/job-view";

function statusLabel(job: PublicJob): string {
  if (job.status === "queued" && job.attempt > 1) return "Retrying";
  if (job.status === "running" && job.attempt > 1) return "Retrying";
  if (job.status === "queued") return "Queued";
  if (job.status === "running") return "Running";
  if (job.status === "succeeded") return "Succeeded";
  if (job.status === "failed") return "Failed";
  if (job.status === "canceled") return "Canceled";
  return job.status;
}

function errorLabel(job: PublicJob): string {
  return job.lastError?.message || job.errorMessage || job.errorCode || "—";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<{ jobs: PublicJob[] }>("/api/jobs");
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
        Age is how long the job has been running (or ran). Attempts count retries and Train polls. Last error
        stays visible while a job retries. Failed stills: generate again from Create. Failed starters: generate
        the vibe again. Failed training: open the character and Train & lock or Retrain.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Status</th>
            <th>Age</th>
            <th>Attempts</th>
            <th>Provider</th>
            <th>Preview</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>{job.kind}</td>
              <td>{statusLabel(job)}</td>
              <td>{formatJobAge(job.durationMs)}</td>
              <td>{formatJobAttempts(job.attempt, job.maxAttempts)}</td>
              <td>{job.provider}</td>
              <td>
                {job.previewUrl ? (
                  <StillPreview src={job.previewUrl} alt="" className="still-thumb job-thumb" />
                ) : (
                  "—"
                )}
              </td>
              <td>
                {errorLabel(job)}
                {job.lastError ? <div className="muted">{job.lastError.code}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
