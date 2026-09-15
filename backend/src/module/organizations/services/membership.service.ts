import { AuditAction, Membership, Role } from "@prisma/client";
import { MembershipRepository } from "../repository/membership.repository.js";
import { MembershipWithUser, TransferOwnership } from "../types/organization.types.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { Logger } from "pino";
import { ForbiddenError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { toMembershipWithUserResponseDto } from "../mappers/membership.mapper.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import type { PaginationMeta } from "../../../shared/types/pagination.types.js";

export class MembershipService {
    constructor(
        private readonly membershipRepository: MembershipRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly idempotencyService: IdempotencyService
    ){}

    async getMembers(
        organizationId: string,
        pagination: PaginationInput
    ): Promise<{
        members: MembershipWithUser[]
        pagination: PaginationMeta
    }>{
        return this.membershipRepository.findByOrganizationId(
            organizationId,
            pagination
        )
    }

    async updateMember(
        organizationId: string,
        memberId: string,
        currentUserRole: Role,
        currentUserId: string,
        newRole: Role,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<Membership>{

        const result = await this.unitOfWork.transaction(async(repos) => {

            const memberships = await repos.memberships.findCurrentUserAndTargetForUpdate(
                currentUserId,
                memberId,
                organizationId
            )

            const currentUserMembership = memberships.find(
                membership => membership.userId === currentUserId
            )

            if (!currentUserMembership) {
                throw new NotFoundError("Current user membership not found")
            }

            const targetMember = memberships.find(
                membership => membership.id === memberId
            )

            if (!targetMember) {
                throw new NotFoundError("Member not found")
            }

            // Use the role read from the locked database row. Do not rely on the role that was loaded earlier
            const currentRole = currentUserMembership.role

            const oldRole: Role = targetMember.role

            // OWNER: 
            // ADMIN <-> MEMBER
            // cannot modify OWNER
            // cannot assign OWNER

            if (oldRole === newRole){
                throw new ForbiddenError("Provide a new role")
            }

            if (currentRole === Role.OWNER && oldRole === Role.OWNER){
            throw new ForbiddenError("Owner can not change their role. Use transer-ownership endpoint instead")
            }

            if (currentRole === Role.OWNER && newRole === Role.OWNER){
                throw new ForbiddenError("Owner can not change their role. Use transer-ownership endpoint instead")
            }

            
            // ADMIN:
            // MEMBER -> ADMIN
            // cannot modify ADMIN
            // cannot modify OWNER
            // cannot assign OWNER

                
            if(currentRole === Role.ADMIN && oldRole !== Role.MEMBER){
                throw new ForbiddenError("Admins can only change MEMBER role")
            }

            if (currentRole === Role.ADMIN && newRole === Role.OWNER){
                throw new ForbiddenError("Admins can not assign an OWNER")
            }

            if (currentRole !== currentUserRole) {
                throw new ForbiddenError("Your organization permissions have changed. Please retry")
            }

            const update = await repos.memberships.updateRole(
                memberId,
                newRole
            )

            await repos.auditLogs.create({
                action: AuditAction.MEMBER_ROLE_UPDATED,
                userId: currentUserId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                metadata: {
                    organizationId,
                    memberId,
                    oldRole,
                    newRole
                }
            })

            return {
                update,
                oldRole,
                currentRole
            }
        })

        logger.info({
            organizationId,
            memberId,
            oldRole: result.oldRole,
            newRole,
            updatedBy: {
                id: currentUserId,
                role: result.currentRole
            }
        }, "Updated member role")

        return result.update
    }

    async transferOwnership(
        organizationId: string,
        memberId: string,
        currentUserId: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<TransferOwnership>{

        try {
            const updatedMembers = await this.unitOfWork.transaction(async(repos) => {
    
                const memberships = await repos.memberships.findCurrentUserAndTargetForUpdate(
                    currentUserId,
                    memberId,
                    organizationId
                )
    
                const currentOwner = memberships.find(
                    membership => membership.userId === currentUserId
                )
    
                if(!currentOwner){
                    throw new NotFoundError("Current owner not found")
                }
    
                if (currentOwner.role !== Role.OWNER) {
                    throw new ForbiddenError("Current user is no longer the OWNER")
                }
    
                const targetMember = memberships.find(
                    membership => membership.id === memberId
                )
    
                if(!targetMember){
                    throw new NotFoundError("Member not found")
                }
    
                if(currentOwner.userId === targetMember.userId){
                    throw new ForbiddenError("Current user is already an OWNER")
                }
    
                if(targetMember.role !== Role.ADMIN){
                    throw new ForbiddenError("Only ADMIN can be trabsfered as OWNER")
                }
    
                const previousOwner = await repos.memberships.updateRoleWithUser(
                    currentOwner.id,
                    Role.ADMIN
                )
    
                const newOwner = await repos.memberships.updateRoleWithUser(
                    memberId,
                    Role.OWNER
                )
    
                await repos.auditLogs.create({
                    action: AuditAction.MEMBER_OWNERSHIP_TRANSFERRED,
                    userId: currentOwner.userId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    metadata: {
                        organizationId,
                        previousOwnerMemberId: currentOwner.id,
                        newOwnerMemberId: memberId
                    }
                })

                const resBody = {
                    success: true,
                    message: "Ownership transfered successfully",
                    data: {
                        previousOwner: toMembershipWithUserResponseDto(previousOwner),
                        newOwner: toMembershipWithUserResponseDto(newOwner)
                    }
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    200,
                    resBody
                )
    
                return {
                    previousOwner,
                    newOwner
                }
            })
    
            logger.info({
                organizationId,
                previousOwner: {
                    userId: updatedMembers.previousOwner.userId,
                    memberId: updatedMembers.previousOwner.id  
                },
                newOwner: {
                    userId: updatedMembers.newOwner.userId,
                    memberId: updatedMembers.newOwner.id
                }
            }, "Ownership has been transfered")
    
            return updatedMembers
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

    async removeMember(
        organizationId: string,
        memberId: string,
        currentUserId: string,
        currentUserRole: Role,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<Membership>{

        const removedMember = await this.unitOfWork.transaction(async(repos) => {
            const memberships = await repos.memberships.findCurrentUserAndTargetForUpdate(
                currentUserId,
                memberId,
                organizationId
            )

            const currentMember = memberships.find(
                membership => membership.userId === currentUserId
            )

            if (!currentMember) {
                throw new NotFoundError("Current user membership not found")
            }

            const targetMember = memberships.find(
                membership => membership.id === memberId
            )

            if (!targetMember){
                throw new NotFoundError("Member not found")
            }

            const currentRole = currentMember.role

            if (currentRole !== currentUserRole) {
                throw new ForbiddenError("Your organization permissions have changed")
            }

            if (currentMember.userId === targetMember.userId){
                throw new ForbiddenError(
                    "You can not remove yourself from the organization. Use leave endpoint instead"
                )
            }

            // OWNER can remove MEMBER or ADMIN
            // ADMIN can remove only MEMBER

            if (targetMember.role === Role.OWNER){
                throw new ForbiddenError("Owner cannot be removed")
            }

            if (currentRole === Role.ADMIN && targetMember.role !== Role.MEMBER){
                throw new ForbiddenError("Admin can only remove MEMBER role")
            }

            const removedMember = await repos.memberships.deleteById(memberId)

            await repos.auditLogs.create({
                action: AuditAction.MEMBER_REMOVED,
                userId: currentMember.userId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                metadata: {
                    organizationId,
                    memberId,
                    removedUserId: targetMember.userId,
                    removedRole: targetMember.role
                }
            })

            return removedMember
        })

        logger.info({
            organizationId,
            memberId,
            removedUserId: removedMember.userId,
            removedBy: {
                userId: currentUserId,
                role: currentUserRole
            }
        } , "Organization member removed")

        return removedMember
    }

    async leaveOrganization(
        organizationId: string,
        memberId: string,
        userId: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<Membership> {
        const leftMember  = await this.unitOfWork.transaction(async(repos) => {

            const member = await repos.memberships.findByIdAndOrganizationForUpdate(memberId,organizationId)

            if (!member) {
                throw new NotFoundError("Membership not found")
            }

            if (member.role === Role.OWNER){
                throw new ForbiddenError("Owner cannot leave the organization. Transfer ownership first")
            }

            const deletedMember = await repos.memberships.deleteById(memberId)

            await repos.auditLogs.create({
                action: AuditAction.MEMBER_LEFT,
                userId,
                ipAddress:metadata.ipAddress,
                userAgent: metadata.userAgent,
                metadata:{
                    organizationId,
                    memberId
                }
            })

            return deletedMember
        })

        logger.info({
            organizationId,
            memberId,
            userId
        }, "User left organization")

        return leftMember
    }
}