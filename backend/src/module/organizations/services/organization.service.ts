import { Logger } from "pino";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { CreateOrganizationInput } from "../validations/create_organization.schema.js";
import { generateSlug } from "../../../shared/utils/common/slug.js";
import { OrganizationRepository } from "../repository/organization.repository.js";
import { AuthContext } from "../../../shared/types/request_context.js";
import { AuditAction, Organization, Role } from "@prisma/client";
import { MembershipRepository } from "../repository/membership.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, SlugConflictError } from "../../../shared/error/HttpErrors.js";
import { UpdateOrganizationInput } from "../validations/update_organization.schema.js";
import { UpdateOrganizationData } from "../types/organization.types.js";
import { toOrganizationResponseDto } from "../mappers/organization.mapper.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import type { PaginationMeta } from "../../../shared/types/pagination.types.js";

export class OrganizationService{ 
    constructor(
        private readonly unitOfWork: UnitOfWork,
        private readonly membershipRepository: MembershipRepository,
        private readonly organizationRepository: OrganizationRepository,
        private readonly idempotencyService: IdempotencyService
    ){}

    private async generateUniqueSlug(
        name: string,
        organizationRepository: OrganizationRepository,
        excludeOrganizationId? : string
    ): Promise<string>{
        const baseSlug = generateSlug(name)

        let slug = baseSlug
        let suffix = 2

        while(await organizationRepository.findBySlug(
            slug,
            excludeOrganizationId
        )){
            slug = `${baseSlug}-${suffix}`
            suffix++
        }

        return slug
    }

    async createOrganization(
        data: CreateOrganizationInput,
        auth: AuthContext,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<Organization>{

        // slug generation + retry
        for (let attempt = 0; attempt < 5; attempt++) {
            
            const slug = await this.generateUniqueSlug(data.name, this.organizationRepository)
            try{
                const organization = await this.unitOfWork.transaction(async(repos) => {

                    const organization = await repos.organizations.create({
                        name: data.name,
                        slug,
                        description: data.description
                    })
    
                    await repos.memberships.create({
                        userId: auth.userId,
                        organizationId: organization.id,
                        role: Role.OWNER}
                    )
    
                    await repos.auditLogs.create({
                        action: AuditAction.ORGANIZATION_CREATED,
                        userId: auth.userId,
                        ipAddress: metadata.ipAddress,
                        userAgent: metadata.userAgent
                    })

                    const responseBody = {
                        success: true,
                        message: "Organization created successfully",
                        data: {organization : toOrganizationResponseDto(organization)}
                    }

                    await repos.idempotency.markCompleted(
                        idempotencyRecordId,
                        201,
                        responseBody
                    )

                    return organization
                })
        
                logger.info({
                    orgId: organization.id,
                    userId: auth.userId,
                }, "Organization created")

                return organization
            } catch (error) {
                // If error is SlugConflictError retry
                // Not considered for marking idempotency faliure
                if(error instanceof SlugConflictError){

                    logger.warn({
                        userId: auth.userId,
                        organizationName: data.name,
                        attemptedSlug: slug,
                        attempt: attempt + 1
                    }, "Retrying with a new slug cuz there is an organization slug conflict")

                    continue 
                }

                await this.idempotencyService.markFailed(idempotencyRecordId)

                throw error
            }
        }

        logger.error({
            userId: auth.userId,
            organizationName: data.name,
            attemps: 5
        }, "Failed to generate a unique organization slug after retries")

        await this.idempotencyService.markFailed(idempotencyRecordId)

        throw new ConflictError("Unable to generate a unique organization slug")
    }

    async getOrganizations(
        userId: string,
        pagination: PaginationInput
    ): Promise<{
        organizations: Organization[]
        pagination: PaginationMeta
    }>{
        return await this.membershipRepository.findOrganizationsByUserId(
            userId,
            pagination
        )
    }

    // Organization context is used for authorization, not as the full organization record
    // Then fetch the full organization here so the service returns complete data for the response DTO
    async getOrganizationById(
        organizationId: string
    ): Promise<Organization>{
        const organization = await this.organizationRepository.findById(organizationId)

        if(!organization){
            throw new NotFoundError("Organization not found")
        }

        return organization
    }

    async updateOrganization(
        organizationId: string,
        userId: string,
        data: UpdateOrganizationInput,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<Organization>{
        for (let attempt = 0; attempt < 5; attempt++) {

            let slug: string | undefined
            
            try{
                const organization =  await this.unitOfWork.transaction(async(repos) => {

                    /*
                    * Lock ordering:
                    * When a transaction requires both Membership and Organization,
                    * always acquire Membership first, then Organization.
                    */
                    const member = await repos.memberships.findByUserAndOrganizationForUpdate(
                        userId,
                        organizationId
                    )

                    if (!member){
                        throw new NotFoundError("Current user is not a member")
                    }

                    if (!([Role.ADMIN, Role.OWNER] as Role[]).includes(member.role)) {
                        throw new ForbiddenError("Insufficient permissions")
                    }

                    const organization = await repos.organizations.findByIdForUpdate(organizationId)

                    if (!organization){
                        throw new NotFoundError("Organization not found")
                    }

                    if (organization.deletedAt !== null) {
                        throw new NotFoundError("Organization not found")
                    }

                    if (data.name !== undefined){
                        slug = await this.generateUniqueSlug(
                            data.name,
                            repos.organizations,
                            organization.id
                        )
                    }

                    const updateData: UpdateOrganizationData = {
                        ...(data.name !== undefined && {
                            name: data.name,
                            slug
                        }),
                        ...(data.description !== undefined && {
                            description: data.description
                        })
                    }
    
                    const organizationUpdate =  await repos.organizations.update(
                        organization.id,
                        updateData
                    )
    
                    await repos.auditLogs.create({
                        action: AuditAction.ORGANIZATION_UPDATED,
                        userId,
                        ipAddress: metadata.ipAddress,
                        userAgent: metadata.userAgent
                    })
    
                    return organizationUpdate
                })
                
                logger.info({
                    organizationId,
                    userId
                }, "Organization updated")

                return organization
            } catch (error) {
                if(!(error instanceof SlugConflictError)){
                    throw error
                }

                logger.warn({
                    userId,
                    organizationId,
                    organizationName: data.name,
                    attemptedSlug: slug,
                    attempt: attempt + 1
                }, "Retrying with a new slug cuz there is an organization slug conflict")
            }            
        }

        logger.error({
            userId,
            organizationId,
            attemps: 5
        }, "Failed to update a unique organization slug after retries ")

        throw new ConflictError("Unable to generate a unique organization slug")
    }

    async deleteOrganization(
        organizationId: string,
        userId: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{
        const organization =  await this.unitOfWork.transaction(async(repos) => {

            const member = await repos.memberships.findByUserAndOrganizationForUpdate(
                userId,
                organizationId
            )

            if (!member){
                throw new NotFoundError("Membership does not exisy")
            }

            if (member.role !== Role.OWNER){
                throw new ForbiddenError("Insuffient permission")
            }

            const organization = await repos.organizations.findByIdForUpdate(organizationId)

            if (!organization){
                throw new NotFoundError("Organization not found")
            }

            if(organization.deletedAt !== null){
                throw new NotFoundError("Organization has already been deleted")
            }

            const deletedOrganization = await repos.organizations.softDelete(organizationId)

            await repos.auditLogs.create({
                action: AuditAction.ORGANIZATION_DELETED,
                userId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            })

            return deletedOrganization
        })

        logger.info({
            organizationId,
            userId,
            deletedAt: organization.deletedAt
        }, "Organization deleted")
    }
}   