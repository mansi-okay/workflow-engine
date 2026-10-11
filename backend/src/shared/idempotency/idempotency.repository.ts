import { IdempotencyStatus, Prisma, PrismaClient, type IdempotencyKey, type IdempotencyOperation  } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { isPrismaUniqueConstraintError } from "../database/prisma_errors.js";
import { IdempotencyKeyConflictError } from "../error/HttpErrors.js";
import type { JsonValue } from "../types/json.types.js";
import type { IdempotencyCreateInput } from "./idempotency.types.js";

export class IdempotencyRepository{
    constructor(
        private readonly db:
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async findByKey(
        userId: string,
        key: string,
        operation: IdempotencyOperation
    ): Promise<IdempotencyKey | null>{
        return this.db.idempotencyKey.findUnique({
            where: {
                userId_key_operation:{
                    userId,
                    key,
                    operation
                }
            }
        })
    }

    async create( 
        data: IdempotencyCreateInput
    ): Promise<IdempotencyKey>{
        try{
            return await this.db.idempotencyKey.create({ 
                data:{
                    key: data.key,
                    userId: data.userId,
                    requestHash: data.requestHash,
                    operation: data.operation,
                    status: data.status,
                    expiresAt: data.expiresAt
                }
            })
        }catch(error){
            if (isPrismaUniqueConstraintError(error, ["userId", "key", "operation"])){
                throw new IdempotencyKeyConflictError()
            }
            throw error
        }
    }

    async markCompleted(
        id: string,
        responseStatus: number,
        responseBody: JsonValue
    ):Promise<IdempotencyKey>{
        const prismaResponseBody = responseBody === null 
        ? Prisma.JsonNull 
        : responseBody as Prisma.InputJsonValue

        return this.db.idempotencyKey.update({
            where:{id},
            data:{
                status: IdempotencyStatus.COMPLETED,
                responseStatus,
                responseBody: prismaResponseBody
            }
        })
    }

    async markFailed(id: string): Promise<boolean>{
        const result = await this.db.idempotencyKey.updateMany({
            where: {
                id,
                status: IdempotencyStatus.PROCESSING
            },
            data: { status: IdempotencyStatus.FAILED }
        })

        return result.count === 1
    }

    async reclaimFailed(id: string): Promise<boolean>{
        const result = await this.db.idempotencyKey.updateMany({
            where:{
                id,
                status:IdempotencyStatus.FAILED
            },
            data:{
                status: IdempotencyStatus.PROCESSING
            }
        })

        return result.count === 1
    }

    async reclaimExpiredProcessing(
        id: string,
        newExpiresAt: Date
    ):Promise<boolean>{
        const result = await this.db.idempotencyKey.updateMany({
            where: {
                id,
                status: IdempotencyStatus.PROCESSING,
                expiresAt: {lt: new Date()}
            },
            data:{
                status: IdempotencyStatus.PROCESSING,
                expiresAt: newExpiresAt
            }
        })

        return result.count === 1
    }
}