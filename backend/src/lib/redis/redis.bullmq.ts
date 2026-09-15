import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../logger.js";

export const bullmqRedis = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null
})

bullmqRedis.on("ready", () => {
    logger.info("BullMQ Redis connection ready")
})

bullmqRedis.on("connect",()=> {
    logger.info("BullMQ Redis connected")
})

bullmqRedis.on("error", (error) => {
    logger.error(error, "BullMQ Redis error")
})

bullmqRedis.on("close", () => {
    logger.warn("BullMQ Redis connection closed")
})

bullmqRedis.on("reconnecting", () => {
    logger.warn("BullMQ Redis reconnecting")
})