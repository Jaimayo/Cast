import { Worker } from "bullmq";
import { JOB_QUEUES } from "@/lib/constants";
import { jobAttemptFromBullmq, shouldRetryJob, classifyJobError } from "@/lib/job-errors";
import { jobLog } from "@/lib/job-log";
import { logWorkerReadiness } from "@/server/health";
import { persistQueueFailure, recoverStaleJobsSafe } from "@/server/jobs";
import { enqueueDeadLetterJob } from "@/server/queue";
import { redisConnection } from "@/server/redis";
import { processGenerateStillJob } from "@/workers/generateStill";
import { processTrainPackJob } from "@/workers/trainPack";
import type { GenerateStillJobData, TrainPackJobData } from "@/server/queue";

const generateWorker = new Worker<GenerateStillJobData>(
  JOB_QUEUES.generateStill,
  async (job) => {
    const attempt = jobAttemptFromBullmq(job);
    jobLog("generateStill.queue_active", {
      jobId: job.data.generationJobId,
      attempt: attempt.attempt,
      maxAttempts: attempt.maxAttempts,
    });
    await processGenerateStillJob(job.data.generationJobId, attempt);
  },
  {
    connection: redisConnection(),
    concurrency: 2,
    lockDuration: 10 * 60 * 1000,
    stalledInterval: 30_000,
    maxStalledCount: 2,
  },
);

const trainWorker = new Worker<TrainPackJobData>(
  JOB_QUEUES.trainPack,
  async (job) => {
    const attempt = jobAttemptFromBullmq(job);
    jobLog("trainPack.queue_active", {
      jobId: job.data.generationJobId,
      packId: job.data.characterPackId,
      pollAttempt: job.data.attempt ?? 0,
      attempt: attempt.attempt,
      maxAttempts: attempt.maxAttempts,
    });
    await processTrainPackJob(
      job.data.generationJobId,
      job.data.characterPackId,
      job.data.attempt ?? 0,
      attempt,
    );
  },
  {
    connection: redisConnection(),
    concurrency: 1,
    lockDuration: 2 * 60 * 1000,
    stalledInterval: 30_000,
    maxStalledCount: 2,
  },
);

for (const worker of [generateWorker, trainWorker]) {
  worker.on("stalled", (jobId) => {
    jobLog("job.stalled", { queue: worker.name, bullmqJobId: jobId });
  });
  worker.on("failed", (job, err) => {
    const attempt = job ? jobAttemptFromBullmq(job) : { attempt: 1, maxAttempts: 1 };
    const classified = classifyJobError(err);
    const unrecoverable = err.name === "UnrecoverableError";
    const terminal = unrecoverable || !shouldRetryJob(classified, attempt);
    jobLog("job.failed", {
      queue: worker.name,
      id: job?.id ?? "unknown",
      jobId:
        job && "generationJobId" in job.data ? String(job.data.generationJobId) : "unknown",
      code: classified.code,
      retryable: classified.retryable,
      attempt: attempt.attempt,
      maxAttempts: attempt.maxAttempts,
      terminal,
      error: err.message,
    });
    if (!job || !terminal) {
      return;
    }
    const generationJobId =
      "generationJobId" in job.data ? String(job.data.generationJobId) : null;
    if (!generationJobId) return;
    void persistQueueFailure(generationJobId, err, attempt.attempt)
      .then(() =>
        enqueueDeadLetterJob({
          sourceQueue: worker.name,
          generationJobId,
          characterPackId:
            job && "characterPackId" in job.data ? String(job.data.characterPackId) : undefined,
          errorCode: classified.code,
          errorMessage: classified.userMessage,
          attemptsMade: attempt.attempt,
        }),
      )
      .catch((persistErr) => {
        jobLog("job.persist_failed", {
          jobId: generationJobId,
          error: persistErr instanceof Error ? persistErr.message : "unknown",
        });
      });
  });
}

async function shutdown() {
  jobLog("workers.shutdown");
  await Promise.all([generateWorker.close(), trainWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

jobLog("workers.online", {
  queues: `${JOB_QUEUES.generateStill},${JOB_QUEUES.trainPack},${JOB_QUEUES.deadLetter}`,
});
void recoverStaleJobsSafe();
void logWorkerReadiness();
