import express from "express";
import cookieParser from "cookie-parser";
import { requestIdMiddleware } from "./shared/middleware/requestId.middleware.js";
import { loggerMiddleware } from "./shared/middleware/request_logger.middleware.js";
import { NotFoundError } from "./shared/error/HttpErrors.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";
import apiRouter from "../src/routes/index.js"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cookieParser())

app.use(requestIdMiddleware)
app.use(loggerMiddleware)

app.use("/api/v1", apiRouter)

app.use((req, res, next) => next(new NotFoundError("Route not found")))

app.use(errorMiddleware)

export default app;