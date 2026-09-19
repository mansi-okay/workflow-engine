import { AuditAction, Invitation, OutboxEventType, Role } from "@prisma/client";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { Logger } from "pino";
import { UserRepository } from "../../users/repository/user.repository.js";
import { ConflictError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import { InvitationRepository } from "../repository/invitation.repository.js";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { env } from "../../../config/env.js";
import { PublicInvitation, type InvitationListResult } from "../types/organization.types.js";
import { toInvitationResponseDto } from "../mappers/invitation.mapper.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";
import { toMembershipResponseDto } from "../mappers/membership.mapper.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";

export class InvitationService{
    constructor(
        private readonly userRepository: UserRepository,
        private readonly invitationRepository: InvitationRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly idempotencyService: IdempotencyService
    ){}

    async createInvitation(
        organizationId: string,
        email: string,
        currentUserId: string,
        role: Role,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<Invitation>{
        try {
            const user = await this.userRepository.findByEmail(email)

            if (!user){
                throw new NotFoundError("User not found")
            }

            const token = generateRandomToken()
            const invitationUrl = `${env.FRONTEND_URL}/invitations/${token}`


            const invitation = await this.unitOfWork.transaction(async(repos) => {

                const existingMember = await repos.memberships.findByUserAndOrganization(
                    user.id,
                    organizationId
                )

                if (existingMember){
                    throw new ConflictError("User is already an existing member")
                }

                const existingActiveInvitation = await repos.invitations.findActiveByOrganizationAndEmail(
                    email,
                    organizationId
                )

                if (existingActiveInvitation){
                    throw new ConflictError("Invitation already sent")
                }

                const invitation = await repos.invitations.create({
                    email,
                    hashedToken: hashToken(token),
                    organizationId,
                    invitedById: currentUserId,
                    role,
                    expiresAt: createExpirationDate(env.INVITATION_TOKEN_EXPIRY)
                })

                const emailIdempotencyKey = `invitation-email-${invitation.id}`
                
                await repos.outbox.create({
                    type: OutboxEventType.SEND_INVITATION_EMAIL,
                    payload: {
                        to: email,
                        subject: "You're invited to join an organization on EventFlow",
                        text: `
                        You have been invited to join an organization on EventFlow.

                        Accept the invitation: 
                        ${invitationUrl}
                        `,
                        idempotencyKey: emailIdempotencyKey
                    }
                })

                await repos.auditLogs.create({
                    action: AuditAction.INVITATION_SENT,
                    userId: currentUserId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent
                })

                const resBody = {
                    success: true,
                    message: "Invitation sent successfully",
                    data: {invitation : toInvitationResponseDto(invitation)}
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    201,
                    resBody
                )

                return invitation
            })

            logger.info({
                organizationId,
                invitedBy: currentUserId,
                invitationTo: email,
                role
            }, "Invitation sent")

            return invitation 
        } catch(error){
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

    async getInvitations(
        organizationId: string,
        pagination: PaginationInput
    ): Promise<InvitationListResult>{
        return await this.invitationRepository.findByOrganization(
            organizationId,
            pagination
        )
    }

    async revokeInvitation(
        organizationId: string,
        invitationId: string,
        userId: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void> {

        await this.unitOfWork.transaction(async(repos) => {

            const invitation = await repos.invitations.findByIdAndOrganizationForUpdate(
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
        idempotencyRecordId: string,
        logger: Logger
    ){
        try {
            const user = await this.userRepository.findById(currentUserId)
    
            if (!user){
                throw new NotFoundError("User not found")
            }
    
            const membership = await this.unitOfWork.transaction(async(repos) => {
    
                // Lock the invitation row so concurrent acceptance/revocation attempts are serialized.
                const invitation = await repos.invitations.findByRawTokenForUpdate(token)
    
                if (!invitation){
                    throw new NotFoundError("Invitation not found")
                }
    
                if (user.email !== invitation.email){
                    throw new ConflictError("Invalid token")
                }
    
                if( invitation.acceptedAt){
                    throw new ConflictError("Token has been accepted")
                }
    
                if (invitation.revokedAt){
                    throw new ConflictError("Token has been revoked")
                }
    
                if(invitation.expiresAt <= new Date()){
                    throw new ConflictError("Invitation is expired")
                }
    
                const existingMember = await repos.memberships.findByUserAndOrganization(
                    currentUserId,
                    invitation.organizationId
                )
    
                if (existingMember){
                    throw new ConflictError("User is already an existing member")
                }
    
                const membership = await repos.memberships.create({
                    userId: user.id,
                    organizationId: invitation.organizationId,
                    role: invitation.role
                })
    
                const markedAccepted = await repos.invitations.markAccepted(invitation.id, new Date())
    
                if (!markedAccepted) {
                    throw new ConflictError("Invitation could not be accepted")
                }
    
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

                const resBody = {
                    success: true,
                    message: "Invitatation accepted successfully",
                    data: {
                        membership: toMembershipResponseDto(membership)
                    }
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    200,
                    resBody
                )
    
                return membership
            })
    
            logger.info({
                currentUserId,
                role: membership.role,
                organizationId: membership.organizationId,
            }, "Invitation accepted")
    
            return membership
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }
}