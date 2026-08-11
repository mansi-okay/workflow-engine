import { RequestHandler } from "express";
import { AsyncController } from "../../types/express.types.js";

export const asyncHandler = (fn: AsyncController): RequestHandler => {
    return (req,res,next) => {
        Promise.resolve(fn(req,res,next)).catch(next)
    }
}
