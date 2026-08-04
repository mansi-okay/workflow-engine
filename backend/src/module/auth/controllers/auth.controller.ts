import { AuthService } from "../services/auth.service.js";
import { Request, Response } from "express";
import { RegisterInput } from "../validations/register.schema.js";
import { AsyncController } from "../../../shared/types/express.types.js";
import { getSessionMetadata } from "../../../shared/utils/http/session_metadata.js";
import { setAuthCookies } from "../../../shared/utils/auth/cookies.js";
import { toUserResponseDto } from "../../users/mappers/user.mapper.js";
import { VerifyEmailInput } from "../validations/verify_email.schema.js";
import { VerificationService } from "../services/verification.service.js";
import { ResendVerificationEmailInput } from "../validations/resend_verification.schema.js";

export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly verificationService: VerificationService
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
}