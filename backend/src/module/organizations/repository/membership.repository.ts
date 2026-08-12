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