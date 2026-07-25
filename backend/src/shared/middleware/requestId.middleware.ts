import { Request, Response, NextFunction } from "express"
import { v4 as uuid } from "uuid"

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = uuid()
    req.requestId = requestId
    res.setHeader("X-Request-Id", requestId)
    next()
}