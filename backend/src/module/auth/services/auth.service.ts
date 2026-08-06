import { env } from "../../../config/env.js";
import { RegisterInput } from "../validations/register.schema.js";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { UserRepository } from "../../users/repository/user.repository.js";
import { BadRequestError, ConflictError, ForbiddenError } from "../../../shared/error/HttpErrors.js";
import { comparePassword, hashPassword } from "../../../shared/utils/auth/password.js";
import { hashToken } from "../../../shared/utils/auth/token.js";
import { AuthResult } from "../types/auth.types.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { generateRandomToken } from "../../../shared/utils/auth/random_token.js";
import { AuditAction, VerificationTokenType } from "@prisma/client";
import { Logger } from "pino";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { SessionService } from "./session.service.js";
import { LoginInput } from "../validations/login.schema.js";
import { AuditRepository } from "../../../shared/audit/audit.repository.js";

export class AuthService{

    constructor(
        private readonly userRepository: UserRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly sessionService: SessionService,
        private readonly auditRepository: AuditRepository
    ){}

    async register(
        data: RegisterInput, 
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<AuthResult>{

        const existingUser = await this.userRepository.findByEmail(data.email)

        if (existingUser){
            throw new ConflictError("Email already exists")
        }

        const hashedPassword = await hashPassword(data.password)

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

        // Session creation is intentionally outside the registration transaction.
        // A session failure should not roll back successful account creation.
        const tokens = await this.sessionService.createSession(registeredUser, metadata)

        logger.info({
            userId: registeredUser.id,
        }, "User registered")

        // to-do: Queue verification mail

        return {
            user: registeredUser,
            ...tokens
        }
    }
    
    async login(
        data: LoginInput,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<AuthResult> {
        const user = await this.userRepository.findByEmail(data.email)

        if (!user){
            throw new BadRequestError("Invalid email or password")
        }

        const isPasswordCorrect = await comparePassword(data.password, user.hashedPassword)

        if (!isPasswordCorrect){
            throw new BadRequestError("Invalid email or password")
        }

        if (!user.isEmailVerified){
            throw new ForbiddenError("Please verify your email")
        }

        const session = await this.sessionService.createSession(user, metadata)

        await this.auditRepository.create({
            action: AuditAction.USER_LOGGED_IN,
            userId: user.id,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent
        })

        logger.info({
            userId: user.id,
            sessionId: session.session.id
        },"User logged in successfully")

        return {
            user,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken
        }
    }

}   