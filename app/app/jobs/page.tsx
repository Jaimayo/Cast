"use client";

import { useEffect, useState } from "react";
import { StillPreview } from "@/components/still-preview";
import { api } from "@/lib/client";

type Job = {
  id: string;
  kind: string;
  status: string;
  provider: string;
  errorCode: string | null;
  errorMessage: string | null;
  lastErrorCode?: string | null;
  lastError?: string | null;
  ageSeconds?: number;
  attemptCount?: number;
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

function formatJobAge(ageSeconds: number | undefined): string | null {
  if (ageSeconds == null || ageSeconds < 0 || !Number.isFinite(ageSeconds)) return null;
  if (ageSeconds < 60) return `${ageSeconds}s`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`;
  if (ageSeconds < 86400) return `${Math.floor(ageSeconds / 3600)}h`;
  return `${Math.floor(ageSeconds / 86400)}d`;
}

function statusMeta(job: Job): string | null {
  const age = formatJobAge(job.ageSeconds);
  const tries = job.attemptCount && job.attemptCount > 0 ? `try ${job.attemptCount}` : null;
  const parts = [age, tries].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function errorLabel(job: Job): string {
  return job.lastError || job.errorMessage || job.lastErrorCode || job.errorCode || "—";
}

function errorCodeLabel(job: Job): string | null {
  const code = job.lastErrorCode || job.errorCode;
  const message = job.lastError || job.errorMessage;
  return message && code ? code : null;
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
          {jobs.map((job) => {
            const meta = statusMeta(job);
            const code = errorCodeLabel(job);
            return (
              <tr key={job.id}>
                <td>{job.kind}</td>
                <td>
                  {statusLabel(job.status)}
                  {meta ? <div className="muted">{meta}</div> : null}
                </td>
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
                  {code ? <div className="muted">{code}</div> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
