import { Invitation, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { PublicInvitation } from "../types/organization.types.js";

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
        organizationId: string
    ): Promise<Invitation[]>{
        return this.db.invitation.findMany({
            where: {organizationId}
        })
    }

    async findByIdAndOrganization(
        invitationId: string,
        organizationId: string
    ): Promise<Invitation | null>{
        return this.db.invitation.findFirst({
            where: {
                id: invitationId,
                organizationId
            }
        })
    }

    async revokeById( invitationId: string): Promise<Invitation>{
        return this.db.invitation.update({
            where: {id: invitationId},
            data: {revokedAt: new Date()}
        })
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
    ): Promise<Invitation>{
        return this.db.invitation.update({
            where: {
                id,
                acceptedAt: null,
                revokedAt: null
            },
            data: {acceptedAt}
        })
    }

    async findByRawToken(
        token: string
    ): Promise<Invitation | null>{
        return this.db.invitation.findUnique({
            where: {hashedToken: hashToken(token)}
        })
    }
}