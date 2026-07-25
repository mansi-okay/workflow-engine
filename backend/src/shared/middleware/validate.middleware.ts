import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../error/HttpErrors.js";

export function validate(schema: z.ZodObject<any>){
    return (req: Request, res: Response, next: NextFunction) => {

        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query
        })

        if(!result.success){
            return next(
                new BadRequestError(
                result.error.issues
                .map(issue => issue.message)
                .join(", ")
            )
        )
        }

        req.body = result.data.body

        next()
    }
}