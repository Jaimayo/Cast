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
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Queue</p>
      <h1 className="mt-1 font-heading text-4xl">Jobs</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        generateStill uses Venice unless the pack has a locked Soul ID adapter — then RunPod. trainPack is
        RunPod. Stub mode never calls vendors.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Failed stills: generate again from Create. Failed starters: generate the vibe again. Failed training:
        open the character and Train & lock or Retrain. Retrain keeps the previous Locked Soul ID if the new
        train fails.
      </p>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Kind</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Preview</th>
              <th className="px-3 py-2 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const meta = statusMeta(job);
              const code = errorCodeLabel(job);
              return (
                <tr key={job.id} className="border-t border-border">
                  <td className="px-3 py-2">{job.kind}</td>
                  <td className="px-3 py-2">
                    {statusLabel(job.status)}
                    {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
                  </td>
                  <td className="px-3 py-2">{job.provider}</td>
                  <td className="px-3 py-2">
                    {job.previewUrl ? (
                      <StillPreview src={job.previewUrl} alt="" className="still-thumb size-12 rounded-md object-cover" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {errorLabel(job)}
                    {code ? <div className="text-xs text-muted-foreground">{code}</div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
