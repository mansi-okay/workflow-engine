import { Logger } from "pino";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { BadRequestError } from "../../../shared/error/HttpErrors.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { AuditAction, OutboxEventType, VerificationTokenType } from "@prisma/client";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { env } from "../../../config/env.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";

export class VerificationService{
    constructor(
        private readonly unitOfWork: UnitOfWork,
        private readonly idempotencyService: IdempotencyService
    ){}

    async verifyEmail(
        token: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<void> {
        try {
            const now = new Date()
    
            const verificationToken = await this.unitOfWork.transaction(async (repos) => {
    
                const verificationToken = await repos.verificationTokens
                .findByRawTokenForUpdate(token)

                const resBody = {
                    success: true,
                    message: "Email verification successful"
                }
    
                if (!verificationToken){
                    throw new BadRequestError("Invalid verification token")
                }
    
                if(verificationToken.expiresAt < now){
                    throw new BadRequestError("Verification token is expired")
                }
    
                if (verificationToken.usedAt){
                    throw new BadRequestError("Verification token is used")
                }
    
                if( verificationToken.user.isEmailVerified){

                    await repos.idempotency.markCompleted(
                        idempotencyRecordId,
                        200,
                        resBody
                    )

                    logger.info({userId: verificationToken.userId}, "Email verification skipped")
    
                    return
                }
    
                await repos.users.markEmailVerified(verificationToken.userId)
    
                await repos.verificationTokens.markUsed(verificationToken.id)

                const emailIdempotencyKey = `verify-email-${verificationToken.id}`

                await repos.outbox.create({
                    type: OutboxEventType.SEND_EMAIL_VERIFICATION_SUCCESS_EMAIL,
                    payload:{
                        to: verificationToken.user.email,
                        subject: "Email verified successfully",
                        text: `
                        Your email address has been successfully verified on EventFlow.
                        `,
                        idempotencyKey: emailIdempotencyKey
                    }
                })
    
                await repos.auditLogs.create({
                    action: AuditAction.EMAIL_VERIFIED,
                    userId: verificationToken.userId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                })

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    200,
                    resBody
                )
    
                return verificationToken
            })
    
            logger.info({
                userId: verificationToken?.userId,
                tokenId: verificationToken?.id,
                verifiedAt: now
            }, "Email verified")
            
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

    async resendVerificationEmail(
        email: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<void>{
        try {
            const token = generateRandomToken()
    
            const user = await this.unitOfWork.transaction(async (repos) => {
    
                const user = await repos.users.findByEmailForUpdate(email)

                const resBody = {
                    success: true,
                    message: "Verification email resent successfully, if account exists and is unverified"
                }
    
                if (!user || user.isEmailVerified){

                    await repos.idempotency.markCompleted(
                        idempotencyRecordId,
                        200,
                        resBody
                    )

                    logger.info({email}, "Verification email resend skipped")
    
                    return
                }
    
                await repos.verificationTokens.deletActiveTokens(user.id, VerificationTokenType.EMAIL_VERIFICATION)
    
                const verificationToken = await repos.verificationTokens.create({
                    userId: user.id,
                    hashedToken: hashToken(token),
                    type: VerificationTokenType.EMAIL_VERIFICATION,
                    expiresAt: createExpirationDate(env.EMAIL_VERIFICATION_TOKEN_EXPIRY)
                })

                const verificationUrl = `${env.FRONTEND_URL}/verify-email/${token}`
                const emailIdempotencyKey = `verification-email-${user.id}-${verificationToken.id}`

                await repos.outbox.create({
                    type: OutboxEventType.SEND_VERIFICATION_EMAIL,
                    payload: {
                        to: user.email,
                        subject: "Verify your email address on EventFlow",
                        text:`
                        Please verify your email address to complete your EventFlow account setup.

                        Please verify your email address by clicking the link below:

                        Verify your email:
                        ${verificationUrl}
                        `,
                        idempotencyKey: emailIdempotencyKey
                    }
                })
    
                await repos.auditLogs.create({
                    action: AuditAction.VERIFICATION_EMAIL_RESENT,
                    userId: user.id,
                    userAgent: metadata.userAgent,
                    ipAddress: metadata.ipAddress
                })

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    200,
                    resBody
                )
    
                return user
            })
    
            logger.info({
                userId: user?.id,
                email: user?.email,
                requestedByIp: metadata.ipAddress
            }, "Verification email resent")
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }
}