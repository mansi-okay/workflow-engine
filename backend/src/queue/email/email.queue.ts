import { Queue } from "bullmq";
import type { EmailJobData } from "./email.types.js";
import { bullmqRedis } from "../../lib/redis/redis.bullmq.js";

export const emailQueue = new Queue<EmailJobData>("email",{
    connection: bullmqRedis,

    defaultJobOptions: {
        attempts: 3,

        backoff:{
            type: "exponential",
            delay: 2000
        },

        removeOnComplete:{
            age: 60*60*24,
            count: 1000
        },

        removeOnFail:{
            age: 60*60*24*7,
            count:5000
        }
    }
})