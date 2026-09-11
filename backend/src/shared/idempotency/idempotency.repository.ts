import { IdempotencyStatus, Prisma, PrismaClient, type IdempotencyKey, type IdempotencyOperation  } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { isPrismaUniqueConstraintError } from "../database/prisma_errors.js";
import { IdempotencyKeyConflictError } from "../error/HttpErrors.js";
import type { JsonValue } from "./idempotency.types.js";

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
        data: Prisma.IdempotencyKeyUncheckedCreateInput
    ): Promise<IdempotencyKey>{
        try{
            return await this.db.idempotencyKey.create({ data })
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
        const prismaResponseBody = responseBody === null ? Prisma.JsonNull : responseBody

        return this.db.idempotencyKey.update({
            where:{id},
            data:{
                status: IdempotencyStatus.COMPLETED,
                responseStatus,
                responseBody: prismaResponseBody
            }
        })
    }

    async markFailed(id: string): Promise<IdempotencyKey>{
        return this.db.idempotencyKey.update({
            where: {id},
            data: { status: IdempotencyStatus.FAILED }
        })
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
}