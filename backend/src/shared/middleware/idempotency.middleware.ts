import { IdempotencyStatus, type IdempotencyOperation } from "@prisma/client";
import type { IdempotencyService } from "../idempotency/idempotency.service.js";
import type { AsyncController } from "../types/express.types.js";
import type { Request, Response, NextFunction } from "express";
import { BadRequestError, ConflictError, NotFoundError } from "../error/HttpErrors.js";
import { getAuthContext } from "../utils/http/get_auth_context.js";
import { hashRequest } from "../utils/common/hash_request.js";

export const idempotencyMiddleware = (
    idempotencyService: IdempotencyService,
    operation: IdempotencyOperation
): AsyncController => {
    return async(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {

        const idempotencyKey = req.get("Idempotency-Key")

        if (!idempotencyKey){
            throw new BadRequestError("Idempotency-Key header is required")
        }

        const { userId } = getAuthContext(req)

        const requestInput = {
            params: req.params,
            body: req.body
        }

        const requestHash = hashRequest(requestInput)

        const result = await idempotencyService.claim(
            userId,
            idempotencyKey,
            operation,
            requestHash
        )

        if (result.type === "NEW" || result.type === "RETRY"){

            req.idempotency = {
                recordId: result.record.id
            }
            
            next()
            return
        }

        const record = result.record

        if (record.status === IdempotencyStatus.PROCESSING){
            throw new ConflictError("Request with this idempotency key is already being processed")
        }

        if (record.status === IdempotencyStatus.COMPLETED){

            if (record.responseStatus === null ||
                record.responseBody === null
            ){
                throw new NotFoundError("Completed idempotency record has no stored response")
            }

            res.status(record.responseStatus).json(record.responseBody)
            return
        }
    }
}