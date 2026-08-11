import { Membership, Organization, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { MembershipWithOrganization } from "../types/organization.types.js";

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
}