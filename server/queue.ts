import { Queue } from "bullmq";
import { JOB_QUEUES } from "@/lib/constants";
import { redisConnection } from "@/server/redis";

export type GenerateStillJobData = {
  generationJobId: string;
};

export type TrainPackJobData = {
  generationJobId: string;
  characterPackId: string;
  attempt?: number;
};

const globalForQueues = globalThis as unknown as {
  generateStillQueue?: Queue<GenerateStillJobData>;
  trainPackQueue?: Queue<TrainPackJobData>;
};

export function getGenerateStillQueue(): Queue<GenerateStillJobData> {
  globalForQueues.generateStillQueue ??= new Queue<GenerateStillJobData>(JOB_QUEUES.generateStill, {
    connection: redisConnection(),
  });
  return globalForQueues.generateStillQueue;
}

export function getTrainPackQueue(): Queue<TrainPackJobData> {
  globalForQueues.trainPackQueue ??= new Queue<TrainPackJobData>(JOB_QUEUES.trainPack, {
    connection: redisConnection(),
  });
  return globalForQueues.trainPackQueue;
}
