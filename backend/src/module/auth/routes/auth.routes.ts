import { Router } from "express";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { registerSchema } from "../validations/register.schema.js";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { authController } from "../../../container/auth.container.js";
import { verifyEmailSchema } from "../validations/verify_email.schema.js";
import { resendVerificationEmailSchema } from "../validations/resend_verification.schema.js";

const router = Router()

router.post("/register", validate(registerSchema, "body"), asyncHandler(authController.register))
router.post("/verify-email", validate(verifyEmailSchema, "query"), asyncHandler(authController.verifyEmail))
router.post("/resend-verification-email",
    validate(resendVerificationEmailSchema, "body"),
    asyncHandler(authController.resendVerificationEmail)
)

export default router