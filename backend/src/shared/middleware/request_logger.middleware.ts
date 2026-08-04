import { Request, Response, NextFunction } from "express";
import { logger } from "../../lib/logger.js";

export function loggerMiddleware(req: Request, res: Response, next:NextFunction){

    const start = Date.now()

    req.logger = logger.child({
        requestId: req.requestId,
        method: req.method,
        url: req.url
    })

    req.logger.info({
        ip: req.ip,
        userAgent: req.get("user-agent")
    }, "Incoming request")

    res.on("finish", () => {
        req.logger.info(
            {
                statusCode : res.statusCode,
                duration: `${Date.now() - start}ms`
            }, "Request completed")
    })

    next()
}   