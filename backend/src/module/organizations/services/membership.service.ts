import { AuditAction, Membership, Role } from "@prisma/client";
import { MembershipRepository } from "../repository/membership.repository.js";
import { MembershipWithUser, TransferOwnership } from "../types/organization.types.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { Logger } from "pino";
import { ForbiddenError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";

export class MembershipService {
    constructor(
        private readonly membershipRepository: MembershipRepository,
        private readonly unitOfWork: UnitOfWork
    ){}

    async getMembers(organizationId: string): Promise<MembershipWithUser[]>{
        return this.membershipRepository.findByOrganizationId(organizationId)
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
        const targetMember = await this.membershipRepository.findByIdAndOrganization(
            memberId,
            organizationId
        )

        if (!targetMember){
            throw new NotFoundError("Member not found")
        }

        const oldRole: Role = targetMember.role


        // OWNER: 
        // ADMIN <-> MEMBER
        // cannot modify OWNER
        // cannot assign OWNER

        if (targetMember.role === newRole){
            throw new ForbiddenError("Provide a new role")
        }

        if (currentUserRole === Role.OWNER && targetMember.role === Role.OWNER){
            throw new ForbiddenError("Owner can not change their role. Use transer-ownership endpoint instead")
        }

        if (currentUserRole === Role.OWNER && newRole === Role.OWNER){
            throw new ForbiddenError("Owner can not change their role. Use transer-ownership endpoint instead")
        }

        // ADMIN:
        // MEMBER -> ADMIN
        // cannot modify ADMIN
        // cannot modify OWNER
        // cannot assign OWNER

        if(currentUserRole === Role.ADMIN && targetMember.role !== Role.MEMBER){
            throw new ForbiddenError("Admins can only change MEMBER role")
        }

        if (currentUserRole === Role.ADMIN && newRole === Role.OWNER){
            throw new ForbiddenError("Admins can not assign an OWNER")
        }

        const updatedMember = await this.unitOfWork.transaction(async(repos) => {

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

            return update
        })

        logger.info({
            organizationId,
            memberId,
            oldRole,
            newRole,
            updatedBy: {
                id: currentUserId,
                role: currentUserRole
            }
        }, "Updated member role")

        return updatedMember
    }

    async transferOwnership(
        organizationId: string,
        currentOwnerMemberId: string,
        memberId: string,
        currentUserId: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<TransferOwnership>{
        const targetMember = await this.membershipRepository.findByIdAndOrganization(
            memberId,
            organizationId
        )

        if(!targetMember){
            throw new NotFoundError("Member not found")
        }

        if(currentUserId === targetMember.userId){
            throw new ForbiddenError("Current user is already an OWNER")
        }

        if(targetMember.role !== Role.ADMIN){
            throw new ForbiddenError("Only ADMIN can be trabsfered as OWNER")
        }

        const updatedMembers = await this.unitOfWork.transaction(async(repos) => {
            const previousOwner = await repos.memberships.updateRoleWithUser(
                currentOwnerMemberId,
                Role.ADMIN
            )

            const newOwner = await repos.memberships.updateRoleWithUser(
                memberId,
                Role.OWNER
            )

            await repos.auditLogs.create({
                action: AuditAction.MEMBER_OWNERSHIP_TRANSFERRED,
                userId: currentUserId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                metadata: {
                    organizationId,
                    previousOwnerMemberId: currentOwnerMemberId,
                    newOwnerMemberId: memberId
                }
            })

            return {
                previousOwner,
                newOwner
            }
        })

        logger.info({
            organizationId,
            previousOwner: {
                userId: currentUserId,
                memberId: currentOwnerMemberId  
            },
            newOwner: {
                userId: targetMember.userId,
                memberId: targetMember.id
            }
        }, "Ownership has been transfered")

        return updatedMembers
    }

    async removeMember(
        organizationId: string,
        memberId: string,
        currentUserId: string,
        currentUserRole: Role,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<Membership>{
        const targetMember = await this.membershipRepository.findByIdAndOrganization(
            memberId,
            organizationId
        )

        if (!targetMember){
            throw new NotFoundError("Member not found")
        }

        if (currentUserId === targetMember.userId){
            throw new ForbiddenError(
                "You can not remove yourself from the organization. Use leave endpoint instead")
        }

        // OWNER can remove MEMBER or ADMIN
        // ADMIN can remove only MEMBER

        if (targetMember.role === Role.OWNER){
            throw new ForbiddenError("Owner cannot be removed")
        }

        if (currentUserRole === Role.ADMIN && targetMember.role !== Role.MEMBER){
            throw new ForbiddenError("Admin can only remove MEMBER role")
        }

        const removedMember = await this.unitOfWork.transaction(async(repos) => {
            const removedMember = await repos.memberships.deleteById(memberId)

            await repos.auditLogs.create({
                action: AuditAction.MEMBER_REMOVED,
                userId: currentUserId,
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
            removedUserId: targetMember.userId,
            removedRole: targetMember.role,
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