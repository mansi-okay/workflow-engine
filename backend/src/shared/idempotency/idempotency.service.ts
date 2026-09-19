import { IdempotencyOperation, IdempotencyStatus, type Prisma } from "@prisma/client";
import type { IdempotencyRepository } from "./idempotency.repository.js";
import type { IdempotencyClaimResult, JsonValue } from "./idempotency.types.js";
import { ConflictError, IdempotencyKeyConflictError } from "../error/HttpErrors.js";
import { env } from "../../config/env.js";
import { createExpirationDate } from "../utils/date/expiration.js";

export class IdempotencyService{
    constructor(
        private readonly idempotencyRepository: IdempotencyRepository
    ){}

    async claim(
        userId: string,
        key: string,
        operation: IdempotencyOperation,
        requestHash: string
    ): Promise<IdempotencyClaimResult>{
        const existing = await this.idempotencyRepository.findByKey(
            userId,
            key,
            operation
        )

        if (existing){
            if(existing.requestHash !== requestHash){
                throw new ConflictError("Idempotency key was already used with different request")
            }

            // Recover stale PROCESSING request
            if (
                existing.status === IdempotencyStatus.PROCESSING && 
                existing.expiresAt < new Date()
            ){
                const reclaimed = await this.idempotencyRepository.reclaimExpiredProcessing(
                    existing.id,
                    createExpirationDate(env.IDEMPOTENCY_KEY_EXPIRY)
                )

                if (reclaimed){
                    return {
                        type: "RETRY",
                        record: existing
                    }
                }

                // Another request reclaimed or completed it first
                const current = await this.idempotencyRepository.findByKey(
                    userId,
                    key,
                    operation
                )

                if (!current){
                    throw new ConflictError("Idempotency record disappeared during retry")
                }

                return {
                    type: "EXISTING",
                    record: current
                }
            }
            
            // Recover FAILED request
            if (existing.status === IdempotencyStatus.FAILED){
                const reclaimed = await this.idempotencyRepository.reclaimFailed(existing.id)

                if (reclaimed){
                    return {
                        type: "RETRY",
                        record: existing
                    }
                }

                // Another request modified the failed status first
                const current = await this.idempotencyRepository.findByKey(
                    userId, 
                    key, 
                    operation
                )

                if (!current){
                    throw new ConflictError("Idempotency record disappeared during retry")
                }

                return {
                    type: "EXISTING",
                    record: current
                }
            }

            return {
                type: "EXISTING",
                record: existing
            }
        }

        try {
            const record = await this.idempotencyRepository.create({
                key,
                userId,
                requestHash,
                operation,
                status: IdempotencyStatus.PROCESSING,
                expiresAt: createExpirationDate(env.IDEMPOTENCY_KEY_EXPIRY)
            })

            return {
                type: "NEW",
                record
            }
        } catch (error) {
            if (error instanceof IdempotencyKeyConflictError){
                const existing = await this.idempotencyRepository.findByKey(userId, key, operation)

                if (!existing){
                    throw error
                }

                if (existing.requestHash !== requestHash){
                    throw new ConflictError("Idempotency key was already used with different request")
                }

                return {
                    type:"EXISTING",
                    record: existing
                }
            }

            throw error
        }
    }

    async markCompleted(
        id: string,
        responseStatus: number,
        responseBody: JsonValue
    ):Promise<void>{
        await this.idempotencyRepository.markCompleted(
            id,
            responseStatus,
            responseBody
        )
    }

    async markFailed(id:string): Promise<void>{
        await this.idempotencyRepository.markFailed(id)
    }

}