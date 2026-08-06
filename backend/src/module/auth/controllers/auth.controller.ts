import { AuthService } from "../services/auth.service.js";
import { Request, Response } from "express";
import { RegisterInput } from "../validations/register.schema.js";
import { AsyncController } from "../../../shared/types/express.types.js";
import { getSessionMetadata } from "../../../shared/utils/http/session_metadata.js";
import { clearAuthCookies, setAuthCookies } from "../../../shared/utils/auth/cookies.js";
import { toUserResponseDto } from "../../users/mappers/user.mapper.js";
import { VerifyEmailInput } from "../validations/verify_email.schema.js";
import { VerificationService } from "../services/verification.service.js";
import { ResendVerificationEmailInput } from "../validations/resend_verification.schema.js";
import { LoginInput } from "../validations/login.schema.js";
import { getAccessToken, getRefreshToken } from "../../../shared/utils/http/get_tokens.js";
import { SessionService } from "../services/session.service.js";
import { toSessionResponseDto } from "../mappers/session.mapper.js";
import { RevokeSessionInput } from "../validations/revoke_session.schema.js";

export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly verificationService: VerificationService,
        private readonly sessionService: SessionService
    ) {}

    register: AsyncController = async (req: Request, res: Response): Promise<void> => {

        const data = req.body as RegisterInput

        const metadata = getSessionMetadata(req)

        const result = await this.authService.register(
            data,
            metadata,
            req.logger
        )

        setAuthCookies(
            res,
            result.accessToken,
            result.refreshToken
        )

        res.status(201).json({
            success:true,
            message: "Registration successful",
            data: {user: toUserResponseDto(result.user)}
        })
    }

    verifyEmail: AsyncController = async (req: Request, res: Response): Promise<void> => {
        const {token} = req.query as VerifyEmailInput

        const metadata = getSessionMetadata(req)

        await this.verificationService.verifyEmail(
            token,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Email verification successful"
        })

    }

    resendVerificationEmail: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const {email} = req.body as ResendVerificationEmailInput

        const metadata = getSessionMetadata(req)

        await this.verificationService.resendVerificationEmail(
            email,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Verification email resent successfully, if account exists and is unverified"
        })
    }

    login: AsyncController = async(req:Request, res: Response): Promise<void> => {
        const data = req.body as LoginInput
        
        const metadata = getSessionMetadata(req)

        const result = await this.authService.login(data, metadata, req.logger)

        setAuthCookies(
            res,
            result.accessToken,
            result.refreshToken
        )

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: {
                user: toUserResponseDto(result.user)
            }
        })
    }

    refresh: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const refreshToken = getRefreshToken(req)
        const metadata = getSessionMetadata(req)

        const result = await this.sessionService.refreshSession(
            refreshToken,
            metadata,
            req.logger
        )

        setAuthCookies(
            res,
            result.accessToken,
            result.refreshToken
        )

        res.status(200).json({
            success: true,
            message: "Refresh token rotated successfully",
            data: {user: toUserResponseDto(result.user)}
        })
    }

    logout: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const accessToken = getAccessToken(req)
        const metadata = getSessionMetadata(req)

        await this.sessionService.logout(
            accessToken, 
            metadata, 
            req.logger
        )

        clearAuthCookies(res)

        res.status(200).json({
            success: true,
            message: "User logged out successfully"
        })
    }

    logoutAll: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const accessToken = getAccessToken(req)
        const metadata = getSessionMetadata(req)

        await this.sessionService.logoutAll(
            accessToken,
            metadata,
            req.logger
        )

        clearAuthCookies(res)

        res.status(200).json({
            success: true,
            message: "User logged out of all sessions successfully"
        })
    }

    getSessions: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const accessToken = getAccessToken(req)

        const { currentSessionId, sessions } = await this.sessionService.getSessions(accessToken)

        const sessionDtos = sessions.map(session =>
            toSessionResponseDto(session, currentSessionId))

        res.status(200).json({
            success: true,
            message: "Fetched user sessions successfully",
            data: {
                sessions: sessionDtos
            }
        })
    }

    revokeUserSession: AsyncController = async(req: Request, res: Response): Promise<void> => {
        const { sessionId } = req.params as RevokeSessionInput

        const accessToken = getAccessToken(req)
        const metadata = getSessionMetadata(req)

        await this.sessionService.revokeUserSession(
            sessionId,
            accessToken,
            metadata,
            req.logger
        )
        
        res.status(200).json({
            success: true,
            message: "User session revoked successfully"
        })
    }
}