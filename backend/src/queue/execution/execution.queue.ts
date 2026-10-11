import { Queue } from "bullmq";
import type { ExecutionJobData } from "./execution.types.js";
import { bullmqRedis } from "../../lib/redis/redis.bullmq.js";

export const executionQueue = new Queue<ExecutionJobData>("execution",{
    connection: bullmqRedis,

    defaultJobOptions: {
        attempts: 5,

        backoff: {
            type: "exponential",
            delay: 3000
        },

        removeOnComplete:{
            age: 60*60*24,
            count: 2000
        },

        removeOnFail: {
            age: 60*60*24*7,
            count: 7000
        }
    }
})