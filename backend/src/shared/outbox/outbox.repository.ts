import { OutboxStatus, type OutboxEvent, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { randomUUID } from "node:crypto";

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

    async claimPending(
        id: string
    ): Promise<{ 
        attempts: number
        claimToken: string 
    } | null> {
        const claimToken = randomUUID()

        const events = await this.db.outboxEvent.updateManyAndReturn({
            where:{
                id,
                status: OutboxStatus.PENDING,
                availableAt:{
                    lte: new Date()
                }
            },
            data:{
                status: OutboxStatus.PROCESSING,
                claimedAt: new Date(),
                claimToken,  
                // if current worker stays crashed for too long then recovery clears the old token new worker sets a new token
                attempts:{
                    increment:1
                }
            },
            select: {
                attempts: true,
                claimToken: true
            }
        })

        const event = events[0];

        if (!event || !event.claimToken) {
            return null
        }

        return {
            attempts: event.attempts,
            claimToken: event.claimToken
        }

    }

    async markCompleted(id: string, claimToken: string): Promise<boolean>{
        const result =await this.db.outboxEvent.updateMany({
            where: {
                id,
                status: OutboxStatus.PROCESSING,
                claimToken
            },
            data:{
                status:OutboxStatus.COMPLETED,
                processedAt: new Date(),
                claimedAt: null,
                claimToken: null
            }
        })

        return result.count === 1
    }

    async markFailed(id: string, 
        attempts: number, 
        claimToken: string
    ): Promise<boolean>{
        const delayMs = Math.min(
            3000 * 2 ** (attempts - 1),
            60*1000
        )

        const result = await this.db.outboxEvent.updateMany({
            where: {
                id,
                status: OutboxStatus.PROCESSING,
                claimToken
            },
            data:{
                status:OutboxStatus.PENDING,
                availableAt: new Date(Date.now() + delayMs),
                claimedAt: null,
                claimToken: null
            }
        })

        return result.count === 1
    }

    async recoverStaleProcessing(
        staleBefore: Date
    ): Promise<number>{
        const result = await this.db.outboxEvent.updateMany({
            where: {
                status: OutboxStatus.PROCESSING,
                claimedAt: {
                    lt: staleBefore
                }
            },
            data: {
                status: OutboxStatus.PENDING,
                claimedAt: null,
                claimToken: null,
                availableAt: new Date()
            }
        })

        return result.count
    }
}