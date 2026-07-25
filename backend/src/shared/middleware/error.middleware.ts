import { Request, Response, NextFunction } from "express";
import { AppError } from "../error/AppError.js";
import { env } from "../../config/env.js";
import { Prisma } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../error/HttpErrors.js";

export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction){
    
    if (err instanceof Prisma.PrismaClientKnownRequestError){
        switch(err.code){
            case "P2002":
                err = new ConflictError("Resource already exists")
                break

            case "P2025":
                err = new NotFoundError("Resource not found")
                break

            case "P2003":
                err = new BadRequestError("Foreign key constraint failed")
                break
        }
    }

    if (err instanceof AppError){
        req.logger.warn({ err }, err.message)

        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        })
    }

    req.logger.error({ err }, "Unhandled error")

    return res.status(500).json({
        success: false,
        message: "Internal server error",
        ...(env.NODE_ENV === "development" && { stack: err.stack })
    })
}