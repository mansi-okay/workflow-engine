import { Prisma, PrismaClient, Session } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { SessionWithUser } from "../types/auth.types.js";

export class SessionRepository{
    constructor (private readonly db:
        PrismaClient |
        Prisma.TransactionClient = prisma
    ) {}

    async create(data: Prisma.SessionUncheckedCreateInput): Promise<Session> {
        return this.db.session.create({data})
    }

    async findByIdWithUser(id: string): Promise<SessionWithUser | null> {
        return this.db.session.findUnique({
            where: { id },
            include: {user: true}
        })
    }

    async rotateRefreshToken(
        sessionId: string,
        refreshToken: string, 
        expiresAt: Date
    ): Promise<Session>{
        return this.db.session.update({
            where: {id: sessionId},
            data: {
                hashedRefreshToken: hashToken(refreshToken),
                expiresAt
            }
        })
    }

    async revokeIfActive(sessionId: string): Promise<boolean>{
        const result =  await this.db.session.updateMany({
            where: {
                id: sessionId,
                revokedAt: null
            },
            data: {revokedAt: new Date()}
        })
        return result.count === 1
    }

    async revokeAllForUser(userId: string): Promise<number> {
        const result = await this.db.session.updateMany({
            where: {
                userId,
                revokedAt: null
            },
            data: {
                revokedAt: new Date()
            }
        })
        return result.count
    }

    async findActiveByUserId(userId: string): Promise<Session[]>{
        return this.db.session.findMany({
            where: {
                userId,
                revokedAt: null
            },
            orderBy: {
                lastUsedAt: "desc"
            }
        })
    }
}