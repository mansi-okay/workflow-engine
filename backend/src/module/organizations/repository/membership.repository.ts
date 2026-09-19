import { Membership, Prisma, PrismaClient, Role } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { MembershipWithOrganization, MembershipWithUser, type MembershipListResult, type OrganizationListResult } from "../types/organization.types.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import { decodeCursor, encodeCursor } from "../../../shared/utils/pagination/cursor.js";
import { organizationCursorSchema } from "../validations/organization_cursor.schema.js";

export class MembershipRepository{
    constructor(private readonly db: 
        PrismaClient |
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.MembershipUncheckedCreateInput): Promise<Membership>{
        return this.db.membership.create({data})
    }

    async findOrganizationsByUserId(
        userId: string,
        {limit, cursor}: PaginationInput
    ): Promise<OrganizationListResult>{
        const decodedCursor = cursor ? decodeCursor(cursor, organizationCursorSchema) : undefined

        const memberships = await this.db.membership.findMany({
            where: {
                userId,
                organization: {
                    deletedAt: null
                },
                ...(decodedCursor && {
                    OR: [
                        {
                            organization: {
                                createdAt: {
                                    lt: decodedCursor.timestamp
                                }
                            }
                        },
                        {
                            organization: {
                                createdAt: decodedCursor.timestamp,
                                id: {
                                    lt: decodedCursor.id
                                }
                            }
                        }
                    ]
                })
            },
            include: {organization: true},
            orderBy: [
                {
                    organization: {createdAt: "desc"}
                },
                {
                    organization: {id: "desc"}
                }
            ],
            take: limit+1
        })

        const hasNextPage = memberships.length > limit

        const items = hasNextPage
        ? memberships.slice(0,limit) 
        : memberships

        const organizations = items.map(membership => membership.organization)

        const lastOrganization = organizations[organizations.length-1]

        const nextCursor = hasNextPage && lastOrganization
        ? encodeCursor({
            timestamp: lastOrganization.createdAt,
            id: lastOrganization.id
        })
        : null

        return {
            organizations,
            pagination: {
                nextCursor,
                hasNextPage
            }
        }
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

    async findByOrganizationId(
        organizationId: string,
        {limit, cursor}: PaginationInput
    ): Promise<MembershipListResult> {
        const decodedCursor = cursor ? decodeCursor(cursor, organizationCursorSchema) : undefined

        const memberships = await this.db.membership.findMany({
            where: {
                organizationId,
                ...(decodedCursor && {
                    OR: [
                        {
                            joinedAt: {
                                lt: decodedCursor.timestamp
                            }
                        },
                        {
                            joinedAt: decodedCursor.timestamp,
                            id: {
                                lt: decodedCursor.id
                            }
                        }
                    ]
                })   
            },       
            include: {
                user:{
                    select:{
                        id: true,
                        name: true,
                        email: true
                    }
                }    
            },          
            orderBy: [
                {joinedAt: "desc"},
                {id: "desc"}
            ],       
            take: limit+1
        })                   
                     
        const hasNextPage = memberships.length > limit
                     
        const items = hasNextPage
        ? memberships.slice(0,limit)
        : memberships
                      
        const lastMembership = items[items.length - 1]
                     
        const nextCursor = hasNextPage && lastMembership
        ? encodeCursor({
            timestamp: lastMembership.joinedAt,
            id: lastMembership.id
        })           
        : null         
                     
        return {     
            members: items,
            pagination: {
                nextCursor,
                hasNextPage
            }        
        }              
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