import { OutboxStatus, type OutboxEvent, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class OutboxRepository{
    constructor(
        private readonly db: 
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.OutboxEventCreateInput): Promise<OutboxEvent>{
        return this.db.outboxEvent.create({data})
    }

    async findPending(limit = 10): Promise<OutboxEvent[]>{
        return this.db.outboxEvent.findMany({
            where: {
                status: OutboxStatus.PENDING,
                availableAt: {
                    lte: new Date()
                }
            },
            orderBy:{
                createdAt:"asc"
            },
            take: limit
        })
    }

    async claimPending(id: string): Promise<boolean>{
        const result = await this.db.outboxEvent.updateMany({
            where:{
                id,
                status: OutboxStatus.PENDING,
                availableAt:{
                    lte: new Date()
                }
            },
            data:{
                status: OutboxStatus.PROCESSING,
                attempts:{
                    increment:1
                }
            }
        })

        return result.count === 1
    }

    async markCompleted(id: string): Promise<void>{
        await this.db.outboxEvent.update({
            where: {id},
            data:{
                status:OutboxStatus.COMPLETED,
                processedAt: new Date()
            }
        })
    }

    async markFailed(id: string): Promise<void>{
        await this.db.outboxEvent.update({
            where: {id},
            data:{
                status:OutboxStatus.PENDING
            }
        })
    }
}