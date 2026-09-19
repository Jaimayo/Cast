"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { StillPreview } from "@/components/still-preview";
import { api } from "@/lib/client";
import { isInProgressJob, jobQueuePresentation, type JobDisplayInput } from "@/lib/job-display";

export type StudioJob = JobDisplayInput & {
  id: string;
  previewUrl?: string | null;
  cancelSupported?: boolean;
  cancelDisabledReason?: string | null;
};

function statusClass(tone: string): string {
  if (tone === "ok") return "job-status is-ok";
  if (tone === "danger") return "job-status is-danger";
  if (tone === "gold") return "job-status is-gold";
  return "job-status";
}

function noteClass(tone: string | null): string {
  if (tone === "retry") return "job-note is-retry";
  if (tone === "fail") return "job-note is-fail error";
  if (tone === "info") return "job-note is-info";
  return "muted";
}

export function JobsQueue() {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudioJob | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("job");
    if (fromUrl) setSelectedId(fromUrl);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<{ jobs: StudioJob[] }>("/api/jobs");
        if (cancelled) return;
        setJobs(data.jobs);
        setError(null);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    const fromList = jobs.find((job) => job.id === selectedId) ?? null;
    if (fromList) setDetail(fromList);
  }, [selectedId, jobs]);

  useEffect(() => {
    if (!selectedId) return;
    setDetailError(null);
    let cancelled = false;
    void api<{ job: StudioJob }>(`/api/jobs/${selectedId}`)
      .then((data) => {
        if (!cancelled) {
          setDetail(data.job);
          setDetailError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "Job not found");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function selectJob(id: string) {
    setSelectedId(id);
    setCancelError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("job", id);
    window.history.replaceState({}, "", url);
  }

  async function cancelJob(id: string) {
    setCancelingId(id);
    setCancelError(null);
    try {
      const data = await api<{ job: StudioJob }>(`/api/jobs/${id}/cancel`, { method: "POST" });
      setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
      setDetail(data.job);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Could not cancel this job.");
    } finally {
      setCancelingId(null);
    }
  }

  const selected = useMemo(() => {
    if (detail && detail.id === selectedId) return detail;
    return jobs.find((job) => job.id === selectedId) ?? null;
  }, [detail, jobs, selectedId]);

  return (
    <section>
      <div className="kicker">Queue</div>
      <h1>Jobs</h1>
      <p className="muted">
        Queued → generating (Retrying if a try hits a snag) → Succeeded, Failed, or Canceled. Queue wait,
        timeouts, and vendor failures use the same user-safe sentences — never prompts, stacks, or provider IDs.
      </p>
      <p className="muted">
        Cancel a still while it is queued or generating. Train & lock can&apos;t be canceled from here. Stub mode
        never calls vendors.
      </p>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingState label="Loading jobs…" /> : null}

      {!loading && jobs.length === 0 && !error ? (
        <EmptyState
          kicker="Queue"
          title="No jobs yet"
          body="Generate from Create, or Train & lock a character. In-progress stills, cancellations, and failures show up here with the same user-safe sentences the queue already stores."
          action={{ href: "/app/create", label: "Open Create" }}
        />
      ) : null}

      {jobs.length > 0 ? (
        <div className="jobs-layout">
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Status</th>
                <th>Preview</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const view = jobQueuePresentation(job);
                const selectedRow = job.id === selectedId;
                return (
                  <tr
                    key={job.id}
                    className={selectedRow ? "jobs-row is-selected" : "jobs-row"}
                    tabIndex={0}
                    aria-selected={selectedRow}
                    aria-busy={isInProgressJob(job)}
                    onClick={() => selectJob(job.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectJob(job.id);
                      }
                    }}
                  >
                    <td>{view.kindLabel}</td>
                    <td>
                      <div className={statusClass(view.statusTone)}>{view.statusLabel}</div>
                      {view.meta ? <div className="muted">{view.meta}</div> : null}
                    </td>
                    <td>
                      {job.previewUrl ? (
                        <StillPreview src={job.previewUrl} alt="" className="still-thumb job-thumb" />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {view.note ? <div className={noteClass(view.noteTone)}>{view.note}</div> : "—"}
                      {view.noteCaption ? <div className="muted">{view.noteCaption}</div> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="job-detail" aria-live="polite">
          {!selected ? (
            <>
              <div className="kicker">Detail</div>
              <h2>Select a job</h2>
              <p className="muted">Open a row to see status, queue wait, attempts, and the user-safe reason if it failed or is retrying.</p>
            </>
          ) : (
            <JobDetailCard
              job={selected}
              loadError={detailError}
              cancelError={cancelError}
              canceling={cancelingId === selected.id}
              onCancel={() => void cancelJob(selected.id)}
            />
          )}
        </aside>
        </div>
      ) : null}
    </section>
  );
}

function JobDetailCard(props: {
  job: StudioJob;
  loadError: string | null;
  cancelError: string | null;
  canceling: boolean;
  onCancel: () => void;
}) {
  const view = jobQueuePresentation(props.job);
  const canCancel = Boolean(props.job.cancelSupported);
  const showDisabledCancel = isInProgressJob(props.job) && !canCancel && Boolean(props.job.cancelDisabledReason);
  return (
    <>
      <div className="kicker">Detail</div>
      <h2>{view.kindLabel}</h2>
      <p className={statusClass(view.statusTone)}>{view.statusLabel}</p>
      {view.meta ? <p className="muted">{view.meta}</p> : null}
      {props.job.previewUrl ? (
        <StillPreview src={props.job.previewUrl} alt="" className="still-thumb job-detail-thumb" />
      ) : null}
      {view.note ? <p className={noteClass(view.noteTone)}>{view.note}</p> : <p className="muted">No error.</p>}
      {view.noteCaption ? <p className="muted">{view.noteCaption}</p> : null}
      {canCancel ? (
        <button className="btn secondary" type="button" disabled={props.canceling} onClick={props.onCancel}>
          {props.canceling ? "Canceling…" : "Cancel still"}
        </button>
      ) : null}
      {showDisabledCancel ? (
        <button
          className="btn secondary"
          type="button"
          disabled
          title={props.job.cancelDisabledReason ?? undefined}
        >
          Cancel
        </button>
      ) : null}
      {showDisabledCancel && props.job.cancelDisabledReason ? (
        <p className="muted">{props.job.cancelDisabledReason}</p>
      ) : null}
      {props.cancelError ? <p className="error">{props.cancelError}</p> : null}
      {props.loadError ? <p className="error">{props.loadError}</p> : null}
    </>
  );
}
