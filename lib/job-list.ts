import { isInProgressJob, jobKindLabel } from "@/lib/job-display";

/** Light Jobs list filters. Kind groups match the product labels from jobKindLabel. */
export const JOB_KIND_GROUPS = ["still", "train", "test_grid", "starter"] as const;
export type JobKindGroup = (typeof JOB_KIND_GROUPS)[number];

export const JOB_KIND_FILTERS = ["all", ...JOB_KIND_GROUPS] as const;
export type JobKindFilter = (typeof JOB_KIND_FILTERS)[number];

export const JOB_STATUS_FILTERS = ["all", "in_progress", "succeeded", "failed", "canceled"] as const;
export type JobStatusFilter = (typeof JOB_STATUS_FILTERS)[number];

export type JobListInput = {
  kind: string;
  status: string;
  stillSource?: string | null;
};

const KIND_ALIASES: Record<string, JobKindFilter> = {
  all: "all",
  still: "still",
  stills: "still",
  generate_still: "still",
  train: "train",
  train_pack: "train",
  test_grid: "test_grid",
  "test-grid": "test_grid",
  testgrid: "test_grid",
  starter: "starter",
  generate_starter: "starter",
  starters: "starter",
};

const STATUS_ALIASES: Record<string, JobStatusFilter> = {
  all: "all",
  in_progress: "in_progress",
  "in-progress": "in_progress",
  inprogress: "in_progress",
  queued: "in_progress",
  running: "in_progress",
  generating: "in_progress",
  training: "in_progress",
  retrying: "in_progress",
  succeeded: "succeeded",
  success: "succeeded",
  failed: "failed",
  fail: "failed",
  canceled: "canceled",
  cancelled: "canceled",
};

export function jobKindGroup(job: Pick<JobListInput, "kind" | "stillSource">): JobKindGroup {
  if (job.kind === "train_pack") return "train";
  if (job.kind === "generate_starter") return "starter";
  if (job.kind === "generate_still" && job.stillSource === "test_grid") return "test_grid";
  return "still";
}

export function jobKindGroupLabel(group: JobKindGroup): string {
  if (group === "train") return jobKindLabel("train_pack");
  if (group === "starter") return jobKindLabel("generate_starter");
  if (group === "test_grid") return jobKindLabel("generate_still", "test_grid");
  return jobKindLabel("generate_still");
}

export function jobKindFilterLabel(filter: JobKindFilter): string {
  return filter === "all" ? "All" : jobKindGroupLabel(filter);
}

export function jobStatusFilterLabel(filter: JobStatusFilter): string {
  if (filter === "in_progress") return "In progress";
  if (filter === "succeeded") return "Succeeded";
  if (filter === "failed") return "Failed";
  if (filter === "canceled") return "Canceled";
  return "All";
}

export function parseJobKindFilter(value?: string | null): JobKindFilter {
  const key = value?.trim().toLowerCase() ?? "";
  return KIND_ALIASES[key] ?? "all";
}

export function parseJobStatusFilter(value?: string | null): JobStatusFilter {
  const key = value?.trim().toLowerCase() ?? "";
  return STATUS_ALIASES[key] ?? "all";
}

export function jobMatchesKindFilter(job: JobListInput, kind: JobKindFilter): boolean {
  return kind === "all" || jobKindGroup(job) === kind;
}

export function jobMatchesStatusFilter(job: JobListInput, status: JobStatusFilter): boolean {
  if (status === "all") return true;
  if (status === "in_progress") return isInProgressJob(job);
  return job.status === status;
}

export function filterJobs<T extends JobListInput>(
  jobs: T[],
  filters: { kind: JobKindFilter; status: JobStatusFilter },
): T[] {
  return jobs.filter(
    (job) => jobMatchesKindFilter(job, filters.kind) && jobMatchesStatusFilter(job, filters.status),
  );
}

export type JobKindSection<T extends JobListInput> = {
  group: JobKindGroup;
  label: string;
  jobs: T[];
};

export function groupJobs<T extends JobListInput>(jobs: T[]): JobKindSection<T>[] {
  return JOB_KIND_GROUPS.map((group) => ({
    group,
    label: jobKindGroupLabel(group),
    jobs: jobs.filter((job) => jobKindGroup(job) === group),
  })).filter((section) => section.jobs.length > 0);
}

export type JobFilterCounts = {
  kind: Record<JobKindFilter, number>;
  status: Record<JobStatusFilter, number>;
};

export function jobFilterCounts<T extends JobListInput>(
  jobs: T[],
  filters: { kind: JobKindFilter; status: JobStatusFilter },
): JobFilterCounts {
  const kind = Object.fromEntries(
    JOB_KIND_FILTERS.map((value) => [value, filterJobs(jobs, { kind: value, status: filters.status }).length]),
  ) as Record<JobKindFilter, number>;
  const status = Object.fromEntries(
    JOB_STATUS_FILTERS.map((value) => [value, filterJobs(jobs, { kind: filters.kind, status: value }).length]),
  ) as Record<JobStatusFilter, number>;
  return { kind, status };
}

export type JobsEmptyCopy = {
  title: string;
  body: string;
};

export function jobsEmptyCopy(input: {
  total: number;
  visible: number;
  kind: JobKindFilter;
  status: JobStatusFilter;
}): JobsEmptyCopy | null {
  if (input.total === 0) {
    return {
      title: "No jobs yet",
      body: "Generate from Create, or Train & lock a character. In-progress stills, cancellations, and failures show up here with the same user-safe sentences the queue already stores.",
    };
  }
  if (input.visible > 0) return null;
  if (input.kind !== "all" && input.status !== "all") {
    return {
      title: `No ${jobStatusFilterLabel(input.status).toLowerCase()} ${jobKindGroupLabel(input.kind)} jobs`,
      body: "This view is empty. Show all jobs, or pick another kind — Still, Train, Test grid. Failures still use the same user-safe sentences.",
    };
  }
  if (input.kind !== "all") {
    return {
      title: `No ${jobKindGroupLabel(input.kind)} jobs`,
      body: "Nothing in this kind yet. Queue a still from Create, Train & lock a character, or run Test grid. Same user-safe timeout and vendor copy if a job fails.",
    };
  }
  return {
    title: `No ${jobStatusFilterLabel(input.status).toLowerCase()} jobs`,
    body: "Nothing matches this status. Show all jobs to see the rest of the queue.",
  };
}

export type JobsListView<T extends JobListInput> = {
  visible: T[];
  sections: JobKindSection<T>[];
  counts: JobFilterCounts;
  empty: JobsEmptyCopy | null;
  showGroupHeaders: boolean;
};

export function jobsListView<T extends JobListInput>(
  jobs: T[],
  filters: { kind: JobKindFilter; status: JobStatusFilter },
): JobsListView<T> {
  const visible = filterJobs(jobs, filters);
  const sections =
    filters.kind === "all"
      ? groupJobs(visible)
      : visible.length
        ? [{ group: filters.kind, label: jobKindGroupLabel(filters.kind), jobs: visible }]
        : [];
  return {
    visible,
    sections,
    counts: jobFilterCounts(jobs, filters),
    empty: jobsEmptyCopy({ total: jobs.length, visible: visible.length, kind: filters.kind, status: filters.status }),
    showGroupHeaders: filters.kind === "all" && sections.length > 0,
  };
}
