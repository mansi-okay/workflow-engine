import { env } from "../../../config/env.js";
import { RegisterInput } from "../validations/register.schema.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { UserRepository } from "../../users/repository/user.repository.js";
import { SessionRepository } from "../repository/session.repository.js";
import { ConflictError } from "../../../shared/error/HttpErrors.js";
import { hashPassword } from "../../../shared/utils/auth/password.js";
import { createId } from "@paralleldrive/cuid2";
import { toAccessPayload, toRefreshPayload } from "../../../shared/utils/auth/payload.mapper.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../../../shared/utils/auth/token.js";
import { RegisterResult } from "../types/auth.types.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { AuditAction, VerificationTokenType } from "@prisma/client";
import { Logger } from "pino";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";

export class AuthService{

    constructor(
        private readonly userRepository: UserRepository,
        private readonly sessionRepository: SessionRepository,
        private readonly unitOfWork: UnitOfWork
    ){}

    async register(
        data: RegisterInput, 
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<RegisterResult>{

        const existingUser = await this.userRepository.findByEmail(data.email)

        if (existingUser){
            throw new ConflictError("Email already exists")
        }

        const hashedPassword = await hashPassword(data.password)

        const sessionId = createId()

        const verificationToken = generateRandomToken()

        const registeredUser = await this.unitOfWork.transaction(async (repos) => {

            const user = await repos.users.create(
                {
                    name: data.name,
                    email: data.email,
                    hashedPassword
                }
            )

            await repos.verificationTokens.create({
                userId: user.id,
                hashedToken: hashToken(verificationToken),
                type: VerificationTokenType.EMAIL_VERIFICATION,
                expiresAt: createExpirationDate(env.EMAIL_VERIFICATION_TOKEN_EXPIRY)
            })

            await repos.auditLogs.create({
                userId: user.id,
                action: AuditAction.USER_REGISTERED,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            })

            return user
        })

        const accessToken = generateAccessToken(toAccessPayload(registeredUser, sessionId))
        const refreshToken = generateRefreshToken(toRefreshPayload(registeredUser,sessionId))

        await this.sessionRepository.create({
            id: sessionId,
            userId: registeredUser.id,
            hashedRefreshToken: hashToken(refreshToken),
            ipAddress:metadata.ipAddress,
            userAgent:metadata.userAgent,
            deviceName:metadata.deviceName,
            expiresAt: createExpirationDate(env.REFRESH_TOKEN_EXPIRY)
        })

        logger.info({
            userId: registeredUser.id,
        }, "User registered")

        // to-do: Queue verification mail

        return {
            user: registeredUser,
            accessToken,
            refreshToken
        }
    }
    

}