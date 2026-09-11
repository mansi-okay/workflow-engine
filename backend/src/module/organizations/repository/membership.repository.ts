import { Membership, Organization, Prisma, PrismaClient, Role } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { MembershipWithOrganization, MembershipWithUser } from "../types/organization.types.js";

export class MembershipRepository{
    constructor(private readonly db: 
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.MembershipUncheckedCreateInput): Promise<Membership>{
        return this.db.membership.create({data})
    }

    async findOrganizationsByUserId(userId: string): Promise<Organization[]>{
        const memberships = await this.db.membership.findMany({
            where: {
                userId,
                organization: {
                    deletedAt: null
                }
            },
            include: {organization: true}
        })

        return memberships.map(membership => membership.organization)
    }

    async findByUserAndOrganization(
        userId: string,
        organizationId: string
    ):Promise<MembershipWithOrganization | null>{
        return this.db.membership.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId
                }
            },
            include: {
                organization: true
            }
        })
    }

    async findByUserAndOrganizationForUpdate(
        userId: string,
        organizationId: string
    ): Promise<Membership | null>{
        const result = await this.db.$queryRaw<Membership[]>`
        SELECT * FROM "Membership"
        WHERE "userId" = ${userId} AND "organizationId" = ${organizationId}
        FOR UPDATE
        `

        return result[0] ?? null
    }

    async findByOrganizationId(organizationId: string): Promise<MembershipWithUser[]> {
        return this.db.membership.findMany({
            where: {organizationId},
            include: {
                user:{
                    select:{
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })
    }

    async findByIdAndOrganization(
        memberId: string, 
        organizationId: string
    ): Promise<Membership | null>{
        return this.db.membership.findFirst({
            where: {
                id: memberId,
                organizationId
            }
        })
    }

    async findByIdAndOrganizationForUpdate(
        memberId: string, 
        organizationId: string
    ): Promise<Membership | null>{
        const result = await this.db.$queryRaw<Membership[]>`
        SELECT *
        FROM "Membership"
        WHERE "id" = ${memberId} AND "organizationId" = ${organizationId}
        FOR UPDATE
        `
        return result[0] ?? null
    }

    async findCurrentUserAndTargetForUpdate(
        currentUserId: string,
        targetMemberId: string,
        organizationId: string
    ): Promise<Membership[]>{
        return this.db.$queryRaw<Membership[]>`
            SELECT * FROM "Membership"
            WHERE "organizationId" = ${organizationId}
            AND (
                "userId" = ${currentUserId}
                OR "id" = ${targetMemberId}
            )
            ORDER BY "id" ASC
            FOR UPDATE
        `
    }
    
    async updateRole(
        memberId: string,
        role: Role
    ): Promise<Membership>{
        return this.db.membership.update({
            where: {id: memberId},
            data: {role}
        })
    }

    async updateRoleWithUser(
        memberId: string,
        role: Role
    ): Promise<MembershipWithUser>{
        return this.db.membership.update({
            where: {id: memberId},
            data: {role},
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })
    } 

    async deleteById(memberId: string): Promise<Membership>{
        return this.db.membership.delete({
            where: { id: memberId }
        })
    }
}