"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { StillPreview } from "@/components/still-preview";
import { api } from "@/lib/client";
import { isInProgressJob, jobQueuePresentation, type JobDisplayInput } from "@/lib/job-display";
import {
  JOB_KIND_FILTERS,
  JOB_STATUS_FILTERS,
  jobKindFilterLabel,
  jobStatusFilterLabel,
  jobsListView,
  parseJobKindFilter,
  parseJobStatusFilter,
  type JobKindFilter,
  type JobStatusFilter,
} from "@/lib/job-list";

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

function writeJobsSearch(input: { job: string | null; kind: JobKindFilter; status: JobStatusFilter }) {
  const url = new URL(window.location.href);
  if (input.job) url.searchParams.set("job", input.job);
  else url.searchParams.delete("job");
  if (input.kind === "all") url.searchParams.delete("kind");
  else url.searchParams.set("kind", input.kind);
  if (input.status === "all") url.searchParams.delete("status");
  else url.searchParams.set("status", input.status);
  window.history.replaceState({}, "", url);
}

export function JobsQueue() {
  const [jobs, setJobs] = useState<StudioJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<JobKindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>("all");
  const [detail, setDetail] = useState<StudioJob | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("job");
    if (fromUrl) setSelectedId(fromUrl);
    setKindFilter(parseJobKindFilter(params.get("kind")));
    setStatusFilter(parseJobStatusFilter(params.get("status")));
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
    writeJobsSearch({ job: id, kind: kindFilter, status: statusFilter });
  }

  function applyKindFilter(next: JobKindFilter) {
    setKindFilter(next);
    writeJobsSearch({ job: selectedId, kind: next, status: statusFilter });
  }

  function applyStatusFilter(next: JobStatusFilter) {
    setStatusFilter(next);
    writeJobsSearch({ job: selectedId, kind: kindFilter, status: next });
  }

  function showAllJobs() {
    setKindFilter("all");
    setStatusFilter("all");
    writeJobsSearch({ job: selectedId, kind: "all", status: "all" });
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

  const view = useMemo(
    () => jobsListView(jobs, { kind: kindFilter, status: statusFilter }),
    [jobs, kindFilter, statusFilter],
  );

  const showQueue = !loading && jobs.length > 0;

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
      <p className="muted">Filter or group by Still, Train, Test grid, or Starter. Status chips sit beside kind.</p>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingState label="Loading jobs…" /> : null}

      {showQueue ? (
        <div className="jobs-filters">
          <div className="chip-family">
            <h4>Kind</h4>
            <div className="chips" role="group" aria-label="Job kind">
              {JOB_KIND_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={kindFilter === value ? "chip selected" : "chip"}
                  aria-pressed={kindFilter === value}
                  onClick={() => applyKindFilter(value)}
                >
                  {jobKindFilterLabel(value)}
                  <span className="jobs-filter-count">{view.counts.kind[value]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="chip-family">
            <h4>Status</h4>
            <div className="chips" role="group" aria-label="Job status">
              {JOB_STATUS_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={statusFilter === value ? "chip selected" : "chip"}
                  aria-pressed={statusFilter === value}
                  onClick={() => applyStatusFilter(value)}
                >
                  {jobStatusFilterLabel(value)}
                  <span className="jobs-filter-count">{view.counts.status[value]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !error && view.empty ? (
        <EmptyState
          kicker="Queue"
          title={view.empty.title}
          body={view.empty.body}
          action={jobs.length === 0 ? { href: "/app/create", label: "Open Create" } : undefined}
        >
          {jobs.length > 0 ? (
            <button className="btn secondary" type="button" onClick={showAllJobs}>
              Show all jobs
            </button>
          ) : null}
        </EmptyState>
      ) : null}

      {showQueue && view.visible.length > 0 ? (
        <div className="jobs-layout">
        <div>
          {view.sections.map((section) => (
            <div key={section.group} className="jobs-group">
              {view.showGroupHeaders ? (
                <div className="jobs-group-head">
                  <h2>{section.label}</h2>
                  <span className="muted">{section.jobs.length}</span>
                </div>
              ) : null}
              <JobsTable jobs={section.jobs} selectedId={selectedId} onSelect={selectJob} />
            </div>
          ))}
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
              loadError={jobs.some((job) => job.id === selected.id) ? null : detailError}
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

function JobsTable(props: {
  jobs: StudioJob[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
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
        {props.jobs.map((job) => {
          const view = jobQueuePresentation(job);
          const selectedRow = job.id === props.selectedId;
          return (
            <tr
              key={job.id}
              className={selectedRow ? "jobs-row is-selected" : "jobs-row"}
              tabIndex={0}
              aria-selected={selectedRow}
              aria-busy={isInProgressJob(job)}
              onClick={() => props.onSelect(job.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onSelect(job.id);
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
