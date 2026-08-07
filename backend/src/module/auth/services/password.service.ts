import { AuditAction, VerificationTokenType } from "@prisma/client";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { BadRequestError, UnauthorizedError } from "../../../shared/error/HttpErrors.js";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { UserRepository } from "../../users/repository/user.repository.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { env } from "../../../config/env.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { Logger } from "pino";
import { VerificationTokenRepository } from "../repository/verification_token.repository.js";
import { comparePassword, hashPassword } from "../../../shared/utils/auth/password.js";

export class PasswordService{
    constructor(
        private readonly userRepository: UserRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly verificationTokenRepository: VerificationTokenRepository
    ){}

    async forgotPassword(
        email: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{
        const user = await this.userRepository.findByEmail(email)

        if (!user) {
            logger.info({ email }, "Password reset skipped")
            return
        }

        const verificationToken = generateRandomToken()

        await this.unitOfWork.transaction(async(repos) => {
            await repos.verificationTokens.deletActiveTokens(user.id, VerificationTokenType.PASSWORD_RESET)

            await repos.verificationTokens.create({
                userId: user.id,
                hashedToken: hashToken(verificationToken),
                type: VerificationTokenType.PASSWORD_RESET,
                expiresAt: createExpirationDate(env.PASSWORD_RESET_TOKEN_EXPIRY)
            })

            await repos.auditLogs.create({
                action: AuditAction.PASSWORD_RESET_REQUESTED,
                userId: user.id,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            })
        })

        logger.info({
            userId: user.id,
            requestedByIp: metadata.ipAddress
        }, "Password reset requested by user")

        // To-do: Queue password reset token email
    }

    async resetPassword(
        token: string,
        newPassword: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{
        const verificationToken = await this.verificationTokenRepository.findByRawToken(token)

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

        const hashedPassword = await hashPassword(newPassword)

        await this.unitOfWork.transaction(async (repos) => {
            await repos.users.updatePassword(verificationToken.userId, hashedPassword)

            await repos.verificationTokens.markUsed(verificationToken.id)

            await repos.sessions.revokeAllForUser(verificationToken.userId)

            await repos.auditLogs.create({
                action: AuditAction.PASSWORD_RESET_COMPLETED,
                userId: verificationToken.userId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            })
        })

        logger.info({
            userId: verificationToken.userId,
            tokenId: verificationToken.id,
            passwordUpdatedAt: new Date()
        }, "Password reset completed")

        // To-do: Queue password reset successful email 
    }

}