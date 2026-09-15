import { Invitation, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { PublicInvitation } from "../types/organization.types.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import type { PaginationMeta } from "../../../shared/types/pagination.types.js";
import { decodeCursor, encodeCursor } from "../../../shared/utils/pagination/cursor.js";

export class InvitationRepository{
    constructor( private readonly db:
        PrismaClient | 
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.InvitationUncheckedCreateInput): Promise<Invitation>{
        return this.db.invitation.create({data})
    }

    async findActiveByOrganizationAndEmail(
        email: string,
        organizationId: string
    ): Promise<Invitation | null>{
        return this.db.invitation.findFirst({
            where: {
                email,
                organizationId,
                revokedAt: null,
                acceptedAt: null,
                expiresAt: {
                    gt: new Date()
                }
            }
        })
    }

    async findByOrganization(
        organizationId: string,
        {limit, cursor}: PaginationInput
    ): Promise<{
        invitations: Invitation[]
        pagination: PaginationMeta
    }>{
        const decodedCursor = cursor ? decodeCursor(cursor) : undefined

        const invitations =  await this.db.invitation.findMany({
            where: {
                organizationId,
                ...(decodedCursor && {
                    OR: [
                        {
                            createdAt: {
                                lt: decodedCursor.timestamp
                            }
                        }, 
                        {
                            createdAt: decodedCursor.timestamp,
                            id:{ 
                                lt: decodedCursor.id
                            }
                        }
                    ]
                })
            },
            orderBy: [
                {createdAt: "desc"},
                {id: "desc"}
            ],
            take: limit +1
        })

        const hasNextPage = invitations.length > limit

        const items = hasNextPage
        ? invitations.slice(0,limit)
        : invitations

        const lastInvitation = items[items.length-1]

        const nextCursor = hasNextPage && lastInvitation
        ? encodeCursor({
            timestamp: lastInvitation.createdAt,
            id: lastInvitation.id
        })
        : null

        return {
            invitations: items,
            pagination: {
                nextCursor,
                hasNextPage
            }
        }
    }

    async findByIdAndOrganizationForUpdate(
        invitationId: string,
        organizationId: string
    ): Promise<Invitation | null>{
        const invitation = await this.db.$queryRaw<Invitation[]>`
        SELECT *
        FROM "Invitation"
        WHERE "id" = ${invitationId} AND "organizationId" = ${organizationId}
        FOR UPDATE
        `

        return invitation[0] ?? null
    }

    async revokeById( invitationId: string): Promise<boolean>{
        const result = await this.db.invitation.updateMany({
            where: {
                id: invitationId,
                revokedAt: null,
                acceptedAt: null
            },
            data: {revokedAt: new Date()}
        })

        return result.count === 1
    }

    async findPublicByRawToken(token: string): Promise<PublicInvitation | null>{
        return this.db.invitation.findUnique({
            where: {hashedToken: hashToken(token)},
            include: {
                organization: {
                    select :{
                        id: true,
                        name: true
                    }
                }
            }
        })
    }

    async markAccepted(
        id: string,
        acceptedAt: Date
    ): Promise<boolean>{
        const result =  await this.db.invitation.updateMany({
            where: {
                id,
                acceptedAt: null,
                revokedAt: null
            },
            data: {acceptedAt}
        })

        return result.count === 1
    }

    async findByRawTokenForUpdate(
        token: string
    ):Promise<Invitation | null>{
        const invitation =  await this.db.$queryRaw<Invitation[]>`
        SELECT * 
        FROM "Invitation"
        WHERE "hashedToken" = ${hashToken(token)}
        FOR UPDATE
        `
        return invitation[0] ?? null
    }
}