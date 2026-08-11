import { Router } from "express";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { registerSchema } from "../validations/register.schema.js";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { authController, authenticateUser } from "../../../container/auth.container.js";
import { verifyEmailSchema } from "../validations/verify_email.schema.js";
import { resendVerificationEmailSchema } from "../validations/resend_verification.schema.js";
import { loginSchema } from "../validations/login.schema.js";
import { revokeSessionSchema } from "../validations/revoke_session.schema.js";
import { forgotPasswordSchema } from "../validations/forgot_password.schema.js";
import { resetPasswordBodySchema, resetPasswordQuerySchema } from "../validations/reset_password.schema.js";

const router = Router()

router.post("/register", validate(registerSchema, "body"), asyncHandler(authController.register))
router.get("/verify-email", validate(verifyEmailSchema, "query"), asyncHandler(authController.verifyEmail))
router.post("/resend-verification-email",
    validate(resendVerificationEmailSchema, "body"),
    asyncHandler(authController.resendVerificationEmail)
)
router.post("/login", validate(loginSchema, "body"), asyncHandler(authController.login))
router.post("/refresh", asyncHandler(authController.refresh))
router.post("/logout", asyncHandler(authenticateUser), asyncHandler(authController.logout))
router.post("/logout-all", asyncHandler(authenticateUser), asyncHandler(authController.logoutAll))
router.get("/sessions", asyncHandler(authenticateUser), asyncHandler(authController.getSessions))
router.delete("/sessions/:sessionId",
    asyncHandler(authenticateUser), 
    validate(revokeSessionSchema, "params"), 
    asyncHandler(authController.revokeUserSession)
)
router.post("/forgot-password",
    validate(forgotPasswordSchema, "body"), 
    asyncHandler(authController.forgotPassword)
)
router.post("/reset-password",
    validate(resetPasswordBodySchema, "body"),
    validate(resetPasswordQuerySchema,"query"),
    asyncHandler(authController.resetPassword)
)

export default router