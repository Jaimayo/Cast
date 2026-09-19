import { Queue, type JobsOptions } from "bullmq";
import { JOB_QUEUES } from "@/lib/constants";
import {
  GENERATE_STILL_BACKOFF_MS,
  GENERATE_STILL_MAX_ATTEMPTS,
  TRAIN_PACK_BACKOFF_MS,
  TRAIN_PACK_MAX_ATTEMPTS,
  deadLetterBullJobId,
  generateStillBullJobId,
  isDuplicateBullJobError,
  trainPackBullJobId,
} from "@/lib/job-errors";
import { redisConnection } from "@/server/redis";
import { trainPollDelayMs } from "@/server/providers/train-status";

export type GenerateStillJobData = {
  generationJobId: string;
};

export type TrainPackJobData = {
  generationJobId: string;
  characterPackId: string;
  attempt?: number;
};

export type DeadLetterJobData = {
  sourceQueue: string;
  generationJobId: string;
  characterPackId?: string;
  errorCode: string;
  errorMessage: string;
  attemptsMade: number;
};

export const GENERATE_STILL_JOB_OPTIONS: JobsOptions = {
  attempts: GENERATE_STILL_MAX_ATTEMPTS,
  backoff: { type: "exponential", delay: GENERATE_STILL_BACKOFF_MS },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

export const TRAIN_PACK_JOB_OPTIONS: JobsOptions = {
  attempts: TRAIN_PACK_MAX_ATTEMPTS,
  backoff: { type: "exponential", delay: TRAIN_PACK_BACKOFF_MS },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 500 },
};

const globalForQueues = globalThis as unknown as {
  generateStillQueue?: Queue<GenerateStillJobData>;
  trainPackQueue?: Queue<TrainPackJobData>;
  deadLetterQueue?: Queue<DeadLetterJobData>;
};

export function getGenerateStillQueue(): Queue<GenerateStillJobData> {
  globalForQueues.generateStillQueue ??= new Queue<GenerateStillJobData>(JOB_QUEUES.generateStill, {
    connection: redisConnection(),
    defaultJobOptions: GENERATE_STILL_JOB_OPTIONS,
  });
  return globalForQueues.generateStillQueue;
}

export function getTrainPackQueue(): Queue<TrainPackJobData> {
  globalForQueues.trainPackQueue ??= new Queue<TrainPackJobData>(JOB_QUEUES.trainPack, {
    connection: redisConnection(),
    defaultJobOptions: TRAIN_PACK_JOB_OPTIONS,
  });
  return globalForQueues.trainPackQueue;
}

export function getDeadLetterQueue(): Queue<DeadLetterJobData> {
  globalForQueues.deadLetterQueue ??= new Queue<DeadLetterJobData>(JOB_QUEUES.deadLetter, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  });
  return globalForQueues.deadLetterQueue;
}

async function addIdempotent<T>(
  queue: { add: (name: string, data: T, opts?: JobsOptions) => Promise<unknown> },
  name: string,
  data: T,
  jobId: string,
  extra?: JobsOptions,
): Promise<void> {
  try {
    await queue.add(name, data, { jobId, ...extra });
  } catch (err) {
    if (isDuplicateBullJobError(err)) return;
    throw err;
  }
}

export async function enqueueGenerateStillJob(generationJobId: string): Promise<void> {
  await addIdempotent(
    getGenerateStillQueue(),
    "generateStill",
    { generationJobId },
    generateStillBullJobId(generationJobId),
    GENERATE_STILL_JOB_OPTIONS,
  );
}

export async function enqueueTrainPackJob(data: TrainPackJobData): Promise<void> {
  const attempt = data.attempt ?? 0;
  await addIdempotent(
    getTrainPackQueue(),
    "trainPack",
    { ...data, attempt },
    trainPackBullJobId(data.generationJobId, attempt),
    attempt > 0
      ? { ...TRAIN_PACK_JOB_OPTIONS, delay: trainPollDelayMs(attempt) }
      : TRAIN_PACK_JOB_OPTIONS,
  );
}

export async function enqueueDeadLetterJob(data: DeadLetterJobData): Promise<void> {
  await addIdempotent(
    getDeadLetterQueue(),
    "deadLetter",
    data,
    deadLetterBullJobId(data.sourceQueue, data.generationJobId),
  );
}

export async function discardGenerateStillJob(generationJobId: string): Promise<void> {
  const queue = getGenerateStillQueue();
  const job = await queue.getJob(generateStillBullJobId(generationJobId));
  if (!job) return;
  try {
    await job.remove();
  } catch {
    // Active jobs keep their lock; the worker checks DB canceled and skips persist.
  }
}
