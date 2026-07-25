import express from "express";
import { requestIdMiddleware } from "./shared/middleware/requestId.middleware.js";
import { loggerMiddleware } from "./shared/middleware/logger.middleware.js";
import { NotFoundError } from "./shared/error/HttpErrors.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(requestIdMiddleware)
app.use(loggerMiddleware)

//routes

app.use((req, res, next) => next(new NotFoundError("Route not found")))

app.use(errorMiddleware)

export default app;