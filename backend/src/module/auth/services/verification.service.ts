import { Logger } from "pino";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { BadRequestError } from "../../../shared/error/HttpErrors.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { VerificationTokenRepository } from "../repository/verification_token.repository.js";
import { AuditAction, VerificationTokenType } from "@prisma/client";
import { UserRepository } from "../../users/repository/user.repository.js";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { env } from "../../../config/env.js";

export class VerificationService{
    constructor(
        private readonly verificationTokenRepository: VerificationTokenRepository,
        private readonly userRepository: UserRepository,
        private readonly unitOfWork: UnitOfWork
    ){}

    async verifyEmail(
        token: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void> {

        const verificationToken = await this.verificationTokenRepository
        .findByRawToken(token)

        if (!verificationToken){
            throw new BadRequestError("Invalid verification token")
        }

        const now = new Date()

        if(verificationToken.expiresAt < now){
            throw new BadRequestError("Verification token is expired")
        }

        if (verificationToken.usedAt){
            throw new BadRequestError("Verification token is used")
        }

        if( verificationToken.user.isEmailVerified){

            logger.info({userId: verificationToken.userId}, "Email verification skipped")

            return; 
        }

        await this.unitOfWork.transaction(async (repos) => {
            await repos.users.markEmailVerified(verificationToken.userId)

            await repos.verificationTokens.markUsed(verificationToken.id)

            await repos.auditLogs.create({
                action: AuditAction.EMAIL_VERIFIED,
                userId: verificationToken.userId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            })
        })

        logger.info({
            userId: verificationToken.userId,
            tokenId: verificationToken.id,
            verifiedAt: now
        }, "Email verified")

        // To do:Queue verification success email
    }

    async resendVerificationEmail(
        email: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{
        const user = await this.userRepository.findByEmail(email)

        if (!user || user.isEmailVerified){
            logger.info({email}, "Verification email resend skipped")

            return
        }

        const token = generateRandomToken()

        await this.unitOfWork.transaction(async (repos) => {
            await repos.verificationTokens.deletActiveTokens(user.id, VerificationTokenType.EMAIL_VERIFICATION)

            await repos.verificationTokens.create({
                userId: user.id,
                hashedToken: hashToken(token),
                type: VerificationTokenType.EMAIL_VERIFICATION,
                expiresAt: createExpirationDate(env.EMAIL_VERIFICATION_TOKEN_EXPIRY)
            })

            await repos.auditLogs.create({
                action: AuditAction.VERIFICATION_EMAIL_RESENT,
                userId: user.id,
                userAgent: metadata.userAgent,
                ipAddress: metadata.ipAddress
            })
        })

        logger.info({
            userId: user.id,
            email: user.email,
            requestedByIp: metadata.ipAddress
        }, "Verification email resent")

        // To-do : Queue an email for re sending verificaton token
    }
}