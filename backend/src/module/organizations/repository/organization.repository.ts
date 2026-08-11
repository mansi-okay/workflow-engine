import { Organization, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { UpdateOrganizationData } from "../types/organization.types.js";
import { isPrismaUniqueConstraintError } from "../../../shared/database/prisma_errors.js";
import { SlugConflictError } from "../../../shared/error/HttpErrors.js";

export class OrganizationRepository{
    constructor( private readonly db: 
        PrismaClient | 
        Prisma.TransactionClient = prisma
    ){}

    async create(data: Prisma.OrganizationCreateInput): Promise<Organization>{
        try {
            return await this.db.organization.create({data})

        } catch (error) {
            if (isPrismaUniqueConstraintError(error,"slug")){
                throw new SlugConflictError()
            }
            throw error
        }
    }

    async findBySlug(
        slug: string, 
        excludeOrganizationId?: string
    ): Promise<Organization | null>{
        return this.db.organization.findUnique({
            where: { 
                slug,
                ...(excludeOrganizationId && {
                    NOT: {id: excludeOrganizationId}
                })
            }
        })
    }

    async findById(organizationId: string): Promise<Organization | null> {
        return this.db.organization.findUnique({
            where: {id: organizationId}
        })
    }

    async update(
        organizationId: string,
        data: UpdateOrganizationData
    ): Promise<Organization>{
        try {
            return await this.db.organization.update({
                where: {id: organizationId},
                data
            })            
        } catch (error) {
            if(isPrismaUniqueConstraintError(error,"slug")){
                throw new SlugConflictError()
            } 
            throw error
        }
    }

    async softDelete(organizationId: string): Promise<Organization> {
        return this.db.organization.update({
            where: {id: organizationId},
            data: { deletedAt: new Date() }
        })
    }
}