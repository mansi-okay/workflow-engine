import { AuditAction, Invitation, Role } from "@prisma/client";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { Logger } from "pino";
import { UserRepository } from "../../users/repository/user.repository.js";
import { ConflictError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import { InvitationRepository } from "../repository/invitation.repository.js";
import { MembershipRepository } from "../repository/membership.repository.js";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { env } from "../../../config/env.js";
import { PublicInvitation } from "../types/organization.types.js";

export class InvitationService{
    constructor(
        private readonly userRepository: UserRepository,
        private readonly invitationRepository: InvitationRepository,
        private readonly membershipRepository: MembershipRepository,
        private readonly unitOfWork: UnitOfWork
    ){}

    async createInvitation(
        organizationId: string,
        email: string,
        currentUserId: string,
        role: Role,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<Invitation>{
        const user = await this.userRepository.findByEmail(email)

        if(user){
            const existingMember = await this.membershipRepository.findByUserAndOrganization(
                user.id,
                organizationId
            )

            if (existingMember){
                throw new ConflictError("User is already an existing member")
            }
        }

        const existingActiveInvitation = await this.invitationRepository
        .findActiveByOrganizationAndEmail(
            email,
            organizationId
        )

        if (existingActiveInvitation){
            throw new ConflictError("Invitation already sent")
        }

        const token = generateRandomToken()

        const invitation = await this.unitOfWork.transaction(async(repos) => {
            const invitation = await repos.invitations.create({
                email,
                hashedToken: hashToken(token),
                organizationId,
                invitedById: currentUserId,
                role,
                expiresAt: createExpirationDate(env.INVITATION_TOKEN_EXPIRY)
            })

            await repos.auditLogs.create({
                action: AuditAction.INVITATION_SENT,
                userId: currentUserId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            })

            return invitation
        })

        logger.info({
            organizationId,
            invitedBy: currentUserId,
            invitationTo: email,
            role
        }, "Invitation sent")

        // To-Do: Queue email with Invitation verification token link

        return invitation
    }

    async getInvitations(
        organizationId: string,
    ): Promise<Invitation[]>{

        // TODO: Implement pagination

        return await this.invitationRepository.findByOrganization(organizationId)
    }

    async revokeInvitation(
        organizationId: string,
        invitationId: string,
        userId: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void> {

        // TODO: revisit invitation state transitions when implementing idempotency/concurrency

        const invitation = await this.invitationRepository.findByIdAndOrganization(
            invitationId,
            organizationId
        )

        if (!invitation){
            throw new NotFoundError("Invitation not found")
        }

        if (invitation.acceptedAt){
            throw new ConflictError("Invitation has already been accepted")
        }

        if (invitation.revokedAt){
            throw new ConflictError("Invitation has already been revoked")
        }

        await this.unitOfWork.transaction(async(repos) => {
            await repos.invitations.revokeById(invitationId)

            await repos.auditLogs.create({
                action: AuditAction.INVITATION_REVOKED,
                userId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                metadata: {
                    organizationId,
                    invitationId
                }
            })
        })

        logger.info({
            organizationId,
            invitationId,
            currentUserId:userId
        }, "Invitation revoked")
    }

    async getPublicInvitation(
        token: string
    ): Promise<PublicInvitation>{
        const invitation = await this.invitationRepository.findPublicByRawToken(token)

        if (!invitation){
            throw new NotFoundError("Invalid token")
        }

        if (invitation.acceptedAt){
            throw new ConflictError("Invitation has been accepted")
        }

        if (invitation.revokedAt){
            throw new ConflictError("Invitation has been revoked")
        }

        const now = new Date()

        if (invitation.expiresAt <= now){
            throw new ConflictError("Invitation is expired")
        }

        return invitation
    }

    async acceptInvitation(
        token: string,
        currentUserId: string,
        metadata: SessionMetadata,
        logger: Logger
    ){
        // TODO: revisit invitation state transitions when implementing idempotency/concurrency

        const invitation = await this.invitationRepository.findByRawToken(token)

        if (!invitation){
            throw new NotFoundError("Invitation not found")
        }

        if( invitation.acceptedAt){
            throw new ConflictError("Token has been accepted")
        }

        if (invitation.revokedAt){
            throw new ConflictError("Token has been revoked")
        }

        const now = new Date()

        if(invitation.expiresAt <= now){
            throw new ConflictError("Invitation is expired")
        }

        const user = await this.userRepository.findById(currentUserId)

        if (!user){
            throw new NotFoundError("User not found")
        }

        if (user){
            const existingMember = await this.membershipRepository.findByUserAndOrganization(
                currentUserId,
                invitation.organizationId
            )

            if (existingMember){
                throw new ConflictError("User is already an existing member")
            }
        }

        if (user.email !== invitation.email){
            throw new ConflictError("Invalid token")
        }


        const membership = await this.unitOfWork.transaction(async(repos) => {
            const membership = await repos.memberships.create({
                userId: user.id,
                organizationId: invitation.organizationId,
                role: invitation.role
            })

            await repos.invitations.markAccepted(invitation.id, new Date())

            await repos.auditLogs.create({
                action: AuditAction.INVITATION_ACCEPTED,
                userId: currentUserId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                metadata: {
                    organizationId: invitation.organizationId,
                    invitationId: invitation.id,
                    membershipId: membership.id,
                    role: invitation.role
                }
            })

            return membership
        })

        logger.info({
            currentUserId,
            role: membership.role,
            organizationId: membership.organizationId,
        }, "Invitation accepted")

        return membership
    }
}