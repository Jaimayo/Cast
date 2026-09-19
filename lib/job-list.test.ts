import { describe, expect, it } from "vitest";
import { AGE_ATTEST_COPY } from "@/lib/age-attest";
import { JOB_CANCEL_MESSAGES } from "@/lib/job-cancel";
import { USER_JOB_MESSAGES } from "@/lib/job-errors";
import { jobKindLabel, jobQueuePresentation } from "@/lib/job-display";
import { TEST_GRID_FICTIONAL_COPY } from "@/lib/test-grid";
import {
  JOB_KIND_GROUPS,
  filterJobs,
  groupJobs,
  jobFilterCounts,
  jobKindFilterLabel,
  jobKindGroup,
  jobKindGroupLabel,
  jobsEmptyCopy,
  jobsListView,
  parseJobKindFilter,
  parseJobStatusFilter,
} from "@/lib/job-list";

const still = { id: "s1", kind: "generate_still", status: "succeeded", stillSource: "composer" };
const train = { id: "t1", kind: "train_pack", status: "running" };
const grid = { id: "g1", kind: "generate_still", status: "succeeded", stillSource: "test_grid" };
const starter = { id: "st1", kind: "generate_starter", status: "queued" };
const failedStill = {
  id: "s2",
  kind: "generate_still",
  status: "failed",
  stillSource: "composer",
  lastErrorCode: "GENERATE_TIMEOUT",
};
const canceledStill = { id: "s3", kind: "generate_still", status: "canceled", stillSource: "demo" };

const queue = [still, train, grid, starter, failedStill, canceledStill];

describe("Jobs kind grouping", () => {
  it("maps Still, Train, Test grid, and Starter from kind + stillSource", () => {
    expect(jobKindGroup(still)).toBe("still");
    expect(jobKindGroup(train)).toBe("train");
    expect(jobKindGroup(grid)).toBe("test_grid");
    expect(jobKindGroup(starter)).toBe("starter");
    expect(jobKindGroup(canceledStill)).toBe("still");
    expect(JOB_KIND_GROUPS.map(jobKindGroupLabel)).toEqual(["Still", "Train", "Test grid", "Starter"]);
  });

  it("groups the queue in Still → Train → Test grid → Starter order and drops empty groups", () => {
    const sections = groupJobs(queue);
    expect(sections.map((section) => section.label)).toEqual(["Still", "Train", "Test grid", "Starter"]);
    expect(sections[0]?.jobs.map((job) => job.id)).toEqual(["s1", "s2", "s3"]);
    expect(sections[1]?.jobs).toEqual([train]);
    expect(sections[2]?.jobs).toEqual([grid]);
    expect(sections[3]?.jobs).toEqual([starter]);
    expect(groupJobs([still]).map((section) => section.group)).toEqual(["still"]);
  });
});

describe("Jobs filters", () => {
  it("parses kind and status query aliases without inventing groups", () => {
    expect(parseJobKindFilter("test-grid")).toBe("test_grid");
    expect(parseJobKindFilter("Train")).toBe("train");
    expect(parseJobKindFilter("generate_still")).toBe("still");
    expect(parseJobKindFilter("nope")).toBe("all");
    expect(parseJobKindFilter(null)).toBe("all");
    expect(parseJobStatusFilter("in-progress")).toBe("in_progress");
    expect(parseJobStatusFilter("queued")).toBe("in_progress");
    expect(parseJobStatusFilter("cancelled")).toBe("canceled");
    expect(parseJobStatusFilter("venice")).toBe("all");
  });

  it("filters by kind independently of status", () => {
    expect(filterJobs(queue, { kind: "still", status: "all" }).map((job) => job.id)).toEqual(["s1", "s2", "s3"]);
    expect(filterJobs(queue, { kind: "train", status: "all" })).toEqual([train]);
    expect(filterJobs(queue, { kind: "test_grid", status: "all" })).toEqual([grid]);
    expect(filterJobs(queue, { kind: "starter", status: "all" })).toEqual([starter]);
    expect(filterJobs(queue, { kind: "all", status: "in_progress" }).map((job) => job.id)).toEqual(["t1", "st1"]);
    expect(filterJobs(queue, { kind: "still", status: "failed" })).toEqual([failedStill]);
    expect(filterJobs(queue, { kind: "train", status: "canceled" })).toEqual([]);
  });

  it("counts chips against the other active filter", () => {
    const counts = jobFilterCounts(queue, { kind: "still", status: "all" });
    expect(counts.kind.all).toBe(6);
    expect(counts.kind.still).toBe(3);
    expect(counts.kind.train).toBe(1);
    expect(counts.kind.test_grid).toBe(1);
    expect(counts.kind.starter).toBe(1);
    expect(counts.status.succeeded).toBe(1);
    expect(counts.status.failed).toBe(1);
    expect(counts.status.canceled).toBe(1);
    expect(counts.status.in_progress).toBe(0);

    const inProgress = jobFilterCounts(queue, { kind: "all", status: "in_progress" });
    expect(inProgress.kind.still).toBe(0);
    expect(inProgress.kind.train).toBe(1);
    expect(inProgress.kind.starter).toBe(1);
    expect(inProgress.status.all).toBe(6);
    expect(inProgress.status.in_progress).toBe(2);
  });

  it("builds the All view with group headers and a filtered empty state", () => {
    const all = jobsListView(queue, { kind: "all", status: "all" });
    expect(all.showGroupHeaders).toBe(true);
    expect(all.sections).toHaveLength(4);
    expect(all.empty).toBeNull();

    const trainOnly = jobsListView(queue, { kind: "train", status: "all" });
    expect(trainOnly.showGroupHeaders).toBe(false);
    expect(trainOnly.visible).toEqual([train]);

    const emptyTrainFailed = jobsListView(queue, { kind: "train", status: "failed" });
    expect(emptyTrainFailed.visible).toEqual([]);
    expect(emptyTrainFailed.empty?.title).toBe("No failed Train jobs");
    expect(emptyTrainFailed.empty?.body).not.toMatch(/prompt|stack|venice|runpod|provider id/i);
  });
});

describe("Jobs empty copy", () => {
  it("keeps the champagne empty queue copy when there are no jobs", () => {
    expect(jobsEmptyCopy({ total: 0, visible: 0, kind: "all", status: "all" })).toEqual({
      title: "No jobs yet",
      body: "Generate from Create, or Train & lock a character. In-progress stills, cancellations, and failures show up here with the same user-safe sentences the queue already stores.",
    });
  });

  it("names the empty kind or status without inventing failure copy", () => {
    expect(jobsEmptyCopy({ total: 4, visible: 0, kind: "test_grid", status: "all" })?.title).toBe("No Test grid jobs");
    expect(jobsEmptyCopy({ total: 4, visible: 0, kind: "all", status: "canceled" })?.title).toBe("No canceled jobs");
    expect(jobsEmptyCopy({ total: 4, visible: 2, kind: "still", status: "all" })).toBeNull();
  });
});

describe("Jobs list polish does not reopen locked copy", () => {
  it("keeps timeout and vendor catalog sentences from #24/#25", () => {
    expect(USER_JOB_MESSAGES.GENERATE_TIMEOUT).toBe("Still generation took too long. Try Generate again.");
    expect(USER_JOB_MESSAGES.PROVIDER_TIMEOUT).toBe("The image service took too long. Try again.");
    expect(USER_JOB_MESSAGES.PROVIDER_INSUFFICIENT_BALANCE).toBe(
      "The image service is out of credits. Try again after balance is restored.",
    );
    expect(USER_JOB_MESSAGES.PROVIDER_RATE_LIMIT).toBe(
      "The image service is rate-limiting requests. Try again in a moment.",
    );
    expect(USER_JOB_MESSAGES.TRAIN_POLL_TIMEOUT).toBe("Training took too long. You can try Train & lock again.");
    expect(USER_JOB_MESSAGES.NETWORK_ERROR).toBe("Network error talking to the image service. Try again.");
    const timeout = jobQueuePresentation({
      kind: "generate_still",
      status: "failed",
      lastErrorCode: "GENERATE_TIMEOUT",
      lastError: null,
    });
    expect(timeout.note).toBe("Still generation took too long. Try Generate again.");
    expect(timeout.noteCaption).toBe("Generate again from Create.");
  });

  it("keeps still cancel and Train uncancellable copy", () => {
    expect(JOB_CANCEL_MESSAGES.still).toBe("This still was canceled.");
    expect(JOB_CANCEL_MESSAGES.trainUnsupported).toBe("Train & lock can't be canceled from Jobs.");
    expect(jobKindFilterLabel("train")).toBe("Train");
  });

  it("does not reopen age, Test grid, or legal copy", () => {
    expect(AGE_ATTEST_COPY).toBe("I confirm I am 18+.");
    expect(TEST_GRID_FICTIONAL_COPY).toMatch(/fictional identity check/i);
    expect(TEST_GRID_FICTIONAL_COPY).not.toMatch(/celebrity|deepfake/i);
    expect(jobKindLabel("generate_still", "test_grid")).toBe("Test grid");
  });
});
