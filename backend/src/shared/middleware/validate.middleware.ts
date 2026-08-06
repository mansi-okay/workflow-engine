import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../error/HttpErrors.js";

export function validate(
    schema: z.ZodObject<any>,
    source: "body" | "query" | "params"
){
    return (req: Request, res: Response, next: NextFunction) => {

        const result = schema.safeParse(req[source])

        if(!result.success){
            return next(
                new BadRequestError(
                result.error.issues
                .map(issue => issue.message)
                .join(", ")
            )
        )
    }

    switch (source) {
        case "body":
            req.body = result.data
            break

        case "query":
            Object.assign(req.query, result.data)
            break

        case "params":
            Object.assign(req.params, result.data)
            break
    }

        next()
    }
}