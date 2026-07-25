import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port: ${env.PORT}`)
})

async function shutDown(signal: string) {

    logger.info(`${signal} recieved. Shutting down server`)

    server.close(async() => {
        await prisma.$disconnect()

        logger.info("Shutdown completed")

        process.exit(0)
    })
}

process.on("SIGINT", () => shutDown("SIGINT"))

process.on("SIGTERM", () => shutDown("SIGTERM"))

process.on("unhandledRejection", (reason) => {
    logger.fatal(reason)
    shutDown("UNHANDLED_REJECTION")
})

process.on("uncaughtException", (error) => {
    logger.fatal(error)
    shutDown("UNCAUGHT_EXCEPTION")
})