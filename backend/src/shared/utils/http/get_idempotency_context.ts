import { Request } from "express"
import { BadRequestError } from "../../error/HttpErrors.js"
import { type IdempotencyContext } from "../../types/request_context.js"

export const getIdempotencyContext = (req: Request): IdempotencyContext => {
    if (!req.idempotency){
        throw new BadRequestError("Idempotency record not found")
    }

    return req.idempotency
}