import { AuditAction, OutboxEventType, VerificationTokenType } from "@prisma/client";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { BadRequestError, UnauthorizedError } from "../../../shared/error/HttpErrors.js";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { env } from "../../../config/env.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { Logger } from "pino";
import { comparePassword, hashPassword } from "../../../shared/utils/auth/password.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";

export class PasswordService{
    constructor(
        private readonly unitOfWork: UnitOfWork,
        private readonly idempotencyService: IdempotencyService
    ){}

    async forgotPassword(
        email: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<void>{

        try {
            const verificationToken = generateRandomToken()
    
            const user = await this.unitOfWork.transaction(async(repos) => {
                const user = await repos.users.findByEmailForUpdate(email)

                const resBody = {
                    success: true,
                    message: "If an account exists, a password reset email has been sent."
                }
    
                if (!user) {
                    await repos.idempotency.markCompleted(
                        idempotencyRecordId,
                        200,
                        resBody
                    )

                    logger.info({ email }, "Password reset skipped")
                    return
                }
    
                await repos.verificationTokens.deletActiveTokens(user.id, VerificationTokenType.PASSWORD_RESET)
    
                await repos.verificationTokens.create({
                    userId: user.id,
                    hashedToken: hashToken(verificationToken),
                    type: VerificationTokenType.PASSWORD_RESET,
                    expiresAt: createExpirationDate(env.PASSWORD_RESET_TOKEN_EXPIRY)
                })
    
                const resetUrl = `${env.FRONTEND_URL}/reset-password/${verificationToken}`
                const emailIdempotencyKey = `reset-password-${user.id}`
    
                await repos.outbox.create({
                    type: OutboxEventType.SEND_PASSWORD_RESET_EMAIL,
                    payload: {
                        to: email,
                        subject: "Reset your EventFlow password",
                        text: `
                        You requested to reset your EventFlow password.
    
                        Reset your password:
                        ${resetUrl}
                        `,
                        idempotencyKey: emailIdempotencyKey
                    }
                })
    
                await repos.auditLogs.create({
                    action: AuditAction.PASSWORD_RESET_REQUESTED,
                    userId: user.id,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent
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
                requestedByIp: metadata.ipAddress
            }, "Password reset requested by user")
            
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

    async resetPassword(
        token: string,
        newPassword: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<void>{

        try {
            const hashedPassword = await hashPassword(newPassword)
    
            const verificationToken = await this.unitOfWork.transaction(async (repos) => {
    
                const verificationToken = await repos.verificationTokens.findByRawTokenForUpdate(token)
    
                if (!verificationToken){
                    throw new UnauthorizedError("Invalid token")
                }
    
                const now = new Date()
    
                if (verificationToken.expiresAt < now ){
                    throw new UnauthorizedError("Invalid token")
                }
    
                if (verificationToken.usedAt) {
                    throw new UnauthorizedError("Invalid token")
                }
    
                if(verificationToken.user.deletedAt || !verificationToken.user.isEmailVerified){
                    throw new UnauthorizedError("Invalid token")
                }
    
                const isSame = await comparePassword(
                    newPassword,
                    verificationToken.user.hashedPassword
                )
    
                if (isSame) {
                    throw new BadRequestError("New password must be different")
                }
    
                await repos.users.updatePassword(verificationToken.userId, hashedPassword)
    
                await repos.verificationTokens.markUsed(verificationToken.id)
    
                await repos.sessions.revokeAllForUser(verificationToken.userId)

                const emailIdempotencyKey = `password-reset-success-${verificationToken.id}`

                await repos.outbox.create({
                    type: OutboxEventType.SEND_PASSWORD_RESET_SUCCESS_EMAIL,
                    payload:{
                        to: verificationToken.user.email,
                        subject: "Your EventFlow password was changed",
                        text:`
                        Your EventFlow password has been successfully changed.

                        If you made this change, no further action is required.

                        If you did not change your password, please contact support immediately.
                        `,
                        idempotencyKey: emailIdempotencyKey
                    }
                })
    
                await repos.auditLogs.create({
                    action: AuditAction.PASSWORD_RESET_COMPLETED,
                    userId: verificationToken.userId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent
                })

                const resBody = {
                    success: true,
                    message: "Password reset successfully"
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    200,
                    resBody
                )
    
                return verificationToken
            })
    
            logger.info({
                userId: verificationToken.userId,
                tokenId: verificationToken.id,
                passwordUpdatedAt: new Date()
            }, "Password reset completed")
        } catch (error) {

            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }
}