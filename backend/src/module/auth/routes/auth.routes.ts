import { Router } from "express";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { registerSchema } from "../validations/register.schema.js";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { authController } from "../../../container/auth.container.js";
import { verifyEmailSchema } from "../validations/verify_email.schema.js";
import { resendVerificationEmailSchema } from "../validations/resend_verification.schema.js";
import { loginSchema } from "../validations/login.schema.js";
import { revokeSessionSchema } from "../validations/revoke_session.schema.js";

const router = Router()

router.post("/register", validate(registerSchema, "body"), asyncHandler(authController.register))
router.get("/verify-email", validate(verifyEmailSchema, "query"), asyncHandler(authController.verifyEmail))
router.post("/resend-verification-email",
    validate(resendVerificationEmailSchema, "body"),
    asyncHandler(authController.resendVerificationEmail)
)
router.post("/login", validate(loginSchema, "body"), asyncHandler(authController.login))
router.post("/refresh", asyncHandler(authController.refresh))
router.post("/logout", asyncHandler(authController.logout))
router.post("/logout-all", asyncHandler(authController.logoutAll))
router.get("/sessions", asyncHandler(authController.getSessions))
router.delete("/sessions/:sessionId", 
    validate(revokeSessionSchema, "params"), 
    asyncHandler(authController.revokeUserSession)
)

export default router