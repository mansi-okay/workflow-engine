import { AuditAction, User } from "@prisma/client";
import { SessionMetadata } from "../../../shared/types/session.types.js";
import { createId } from "@paralleldrive/cuid2";
import { generateAccessToken,generateRefreshToken, hashToken, verifyRefreshToken, verifyTokenHash } from "../../../shared/utils/auth/token.js";
import { toAccessPayload, toRefreshPayload } from "../../../shared/utils/auth/payload.mapper.js";
import { SessionRepository } from "../repository/session.repository.js";
import { createExpirationDate } from "../../../shared/utils/date/expiration.js";
import { env } from "../../../config/env.js";
import { AuthResult, SessionResult, SessionsResult } from "../types/auth.types.js";
import { Logger } from "pino";
import { BadRequestError, UnauthorizedError } from "../../../shared/error/HttpErrors.js";
import { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { AuthContext } from "../../../shared/types/request_context.js";

export class SessionService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly unitOfWork: UnitOfWork
    ){}

    private async revokeSession(
        sessionId: string,
        userId: string,
        metadata: SessionMetadata,
        auditAction: AuditAction
    ): Promise<void>{
        await this.unitOfWork.transaction(async(repos) => {
            const revoked = await repos.sessions.revokeIfActive(sessionId)

            if (!revoked){
                return
            }

            await repos.auditLogs.create({
                action: auditAction,
                userId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            })
        })
    }

    private async revokeAllSessions(
        userId: string,
        metadata: SessionMetadata,
        auditAction: AuditAction
    ): Promise<number>{
        return await this.unitOfWork.transaction(async(repos) => {
            const revokedCount = await repos.sessions.revokeAllForUser(userId)

            if (revokedCount === 0) {
                return 0
            }

            await repos.auditLogs.create({
                action: auditAction,
                userId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            })

            return revokedCount
        })
    }

    async createSession(user: User, metadata: SessionMetadata): Promise<SessionResult>{

        const sessionId = createId()
        const accessToken = generateAccessToken(toAccessPayload(user, sessionId))
        const refreshToken = generateRefreshToken(toRefreshPayload(user,sessionId))
        
        const session = await this.sessionRepository.create({
            id: sessionId,
            userId: user.id,
            hashedRefreshToken: hashToken(refreshToken),
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceName: metadata.deviceName,
            expiresAt: createExpirationDate(env.REFRESH_TOKEN_EXPIRY)
        })

        return {
            session,
            accessToken,
            refreshToken
        }    
    }

    async refreshSession(
        refreshToken: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<AuthResult>{
        const payload = verifyRefreshToken(refreshToken)

        const userId = payload.sub
        const sessionId = payload.sid

        const session = await this.sessionRepository.findByIdWithUser(sessionId)

        if (!session){
            throw new UnauthorizedError("Invalid refresh token")
        }

        if (session.userId !== userId) {
            throw new UnauthorizedError("Invalid refresh token");
        }

        if (session.revokedAt){
            throw new UnauthorizedError("Invalid refresh token")
        }

        const now = new Date()

        if (session.expiresAt < now){
            throw new UnauthorizedError("Invalid refresh token")
        }

        const isRefreshTokenValid = verifyTokenHash(refreshToken, session.hashedRefreshToken)

        if(!isRefreshTokenValid){

            await this.revokeSession(
                sessionId,
                userId,
                metadata,
                AuditAction.SESSION_REVOKED
            )

            logger.warn({
                userId,
                sessionId
            }, "Refresh token reuse detected. Session revoked")

            throw new UnauthorizedError("Invalid refresh token")
        }

        if (session.user.deletedAt || !session.user.isEmailVerified){
            throw new UnauthorizedError("Invalid refresh token")
        }

        const accessToken = generateAccessToken(toAccessPayload(session.user, sessionId))
        const newRefreshToken = generateRefreshToken(toRefreshPayload(session.user, sessionId))

        const expiresAt = createExpirationDate(env.REFRESH_TOKEN_EXPIRY);

        await this.unitOfWork.transaction(async(repos) => {
            await repos.sessions.rotateRefreshToken(
                sessionId, 
                newRefreshToken, 
                expiresAt
            )

            await repos.auditLogs.create({
                action: AuditAction.SESSION_REFRESHED,
                userId: userId,
                ipAddress:metadata.ipAddress,
                userAgent:metadata.userAgent
            })

        })

        logger.info({
            userId,
            sessionId,
            expiresAt
        }, "Session refreshed")

        return {
            user: session.user,
            refreshToken: newRefreshToken,
            accessToken
        }
    }

    async logout(
        auth: AuthContext,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{

        await this.revokeSession(
            auth.sessionId,
            auth.userId, 
            metadata, 
            AuditAction.USER_LOGGED_OUT
        )

        logger.info({
            userId: auth.userId,
            sessionId: auth.sessionId
        }, "User logged out successfully")
    }

    async logoutAll(
        auth: AuthContext,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void> {

        const revokeCount = await this.revokeAllSessions(
            auth.userId,
            metadata,
            AuditAction.USER_LOGGED_OUT_ALL
        )

        logger.info({
            userId: auth.userId,
            sessionId: auth.sessionId,
            revokedSessions: revokeCount
        }, "User logged out of all sessions")
    }

    async getSessions(
        auth: AuthContext
    ): Promise<SessionsResult>{

        const sessions = await this.sessionRepository.findActiveByUserId(auth.userId)

        return {
            currentSessionId: auth.sessionId,
            sessions
        }
    }

    async revokeUserSession(
        sessionId: string,
        auth: AuthContext,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{

        if (sessionId === auth.sessionId) {
            throw new BadRequestError("Use the logout endpoint to revoke the current session")
        }

        const session = await this.sessionRepository.findByIdWithUser(sessionId)

        if (!session){
            throw new UnauthorizedError("Invalid access token")
        }

        if (session.userId !== auth.userId){
            throw new UnauthorizedError("Invalid access token")
        }

        if(session.user.deletedAt){
            throw new UnauthorizedError("Invalid access token")
        }

        if(session.revokedAt){
            logger.info({
                userId: auth.userId,
                sessionId
            }, "Session is already revoked")           
            return
        }

        await this.revokeSession(
            sessionId, 
            auth.userId, 
            metadata, 
            AuditAction.USER_LOGGED_OUT
        )

        logger.info({
            userId: auth.userId,
            currentSessionId: auth.sessionId,
            revokedSessionId: sessionId
        }, "User session revoked")
    }
}