"use client";

import { useEffect, useMemo, useRef } from "react";
import { LoadingState } from "@/components/loading-state";
import { StillPreview } from "@/components/still-preview";
import { CastMark } from "@/components/wordmark";
import { api } from "@/lib/client";
import { GENERATE_IN_PROGRESS_COPY } from "@/lib/generate-affordances";
import { jobQueuePresentation } from "@/lib/job-display";
import {
  TEST_GRID_EMPTY_COPY,
  TEST_GRID_FICTIONAL_COPY,
  mergeTestGridJobs,
  testGridCellsFromJobs,
  type TestGridJob,
} from "@/lib/test-grid";

export function TestGridPanel(props: {
  packId: string;
  packName: string;
  jobs: TestGridJob[];
  pending?: boolean;
  onJobs: (jobs: TestGridJob[]) => void;
}) {
  const jobsRef = useRef(props.jobs);
  jobsRef.current = props.jobs;
  const onJobs = props.onJobs;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<{ jobs: TestGridJob[] }>("/api/jobs");
        if (cancelled) return;
        onJobs(mergeTestGridJobs(jobsRef.current, data.jobs, props.packId));
      } catch {
        /* Keep POST-filled cells if Jobs poll fails. */
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onJobs, props.packId]);

  const cells = useMemo(() => testGridCellsFromJobs(props.jobs, props.packId), [props.jobs, props.packId]);

  return (
    <div className="test-grid-panel">
      <div className="row-between">
        <h3>Test grid</h3>
        <span className="fictional-badge">Fictional only</span>
      </div>
      <p className="muted">{TEST_GRID_FICTIONAL_COPY}</p>
      <div className="test-grid" role="list">
        {cells.map((cell) => {
          const loading = props.pending || cell.state === "queued" || cell.state === "running";
          const view = cell.job ? jobQueuePresentation(cell.job) : null;
          const className = [
            "test-grid-cell",
            loading ? "is-loading" : "",
            cell.state === "empty" && !loading ? "is-empty" : "",
            cell.state === "failed" ? "is-failed" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <article key={cell.poseChipId} className={className} role="listitem">
              <div className="test-grid-frame" style={{ aspectRatio: "3 / 4" }}>
                {cell.previewUrl && !loading ? (
                  <StillPreview
                    src={cell.previewUrl}
                    alt={`${props.packName} fictional Test grid · ${cell.poseLabel}`}
                    label={cell.poseLabel}
                  />
                ) : loading ? (
                  <LoadingState
                    compact
                    label={view?.note ?? GENERATE_IN_PROGRESS_COPY}
                  />
                ) : (
                  <div className="test-grid-empty">
                    <CastMark className="empty-state-mark" />
                    <strong>{cell.poseLabel}</strong>
                    <span className="muted">{TEST_GRID_EMPTY_COPY}</span>
                  </div>
                )}
              </div>
              <p className="kicker test-grid-caption">
                {cell.poseLabel} · {cell.aspectLabel}
                {view ? ` · ${view.statusLabel}` : ""}
              </p>
              {cell.job && view?.note && cell.state === "failed" ? (
                <p className="error">{view.note}</p>
              ) : null}
              {cell.job ? (
                <p className="muted">
                  <a href={`/app/jobs?job=${encodeURIComponent(cell.job.id)}`}>Open in Jobs</a>
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
