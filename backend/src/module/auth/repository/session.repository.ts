import { Prisma, PrismaClient, Session } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { SessionWithUser } from "../types/auth.types.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import type { PaginationMeta } from "../../../shared/types/pagination.types.js";
import { decodeCursor, encodeCursor } from "../../../shared/utils/pagination/cursor.js";
import { sessionCursorSchema } from "../validations/session_cursor.schema.js";

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

    async findByIdWithUserForUpdate(id: string): Promise<SessionWithUser | null>{
        const result = await this.db.$queryRaw<Session[]>`
        SELECT * FROM "Session"
        WHERE "id" = ${id}
        FOR UPDATE
        `

        const session = result[0]

        if (!session){ 
            return null
        }

        const user = await this.db.user.findUnique({
            where: {
                id: session.userId
            }
        })

        if (!user){
            return null
        }

        return {
            ...session,
            user
        }
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

    async findActiveByUserId(
        userId: string,
        {limit, cursor}: PaginationInput
    ): Promise<{
        sessions: Session[]
        pagination: PaginationMeta
    }>{

        const decodedCursor = cursor ? decodeCursor(cursor, sessionCursorSchema) : undefined

        const sessions = await this.db.session.findMany({
            where: {
                userId,
                revokedAt: null,
                ...(decodedCursor && {
                    OR: [
                        {
                            lastUsedAt: {
                                lt: decodedCursor.lastUsedAt
                            }
                        },
                        {
                            lastUsedAt: decodedCursor.lastUsedAt,
                            createdAt: {
                                lt: decodedCursor.createdAt
                            }
                        },
                        {
                            lastUsedAt: decodedCursor.lastUsedAt,
                            createdAt: decodedCursor.createdAt,
                            id: {
                                lt: decodedCursor.id
                            }
                        }
                    ]
                })
            },
            orderBy: [
                {lastUsedAt: "desc"},
                {createdAt: "desc"},
                {id: "desc"}
            ],
            take: limit+1
        })

        const hasNextPage = sessions.length > limit

        const items = hasNextPage 
        ? sessions.slice(0,limit)
        : sessions

        const lastSession = items[items.length-1]

        const nextCursor = hasNextPage && lastSession
        ? encodeCursor({
            lastUsedAt: lastSession.lastUsedAt,
            createdAt: lastSession.createdAt,
            id: lastSession.id
        })
        : null

        return {
            sessions: items,
            pagination: {
                nextCursor,
                hasNextPage
            }
        }
    }
}