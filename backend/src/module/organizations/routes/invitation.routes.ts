import { Router } from "express";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { getInvitationParamsSchema } from "../validations/get_invitation.schema.js";
import { organizationController } from "../../../container/organization.container.js";
import { authenticateUser } from "../../../container/auth.container.js";
import { acceptInvitationParamsSchema } from "../validations/accept_invitation.schema.js";

const router = Router()

router.get( 
    "/:token",
    validate(getInvitationParamsSchema, "params"), 
    asyncHandler(organizationController.getPublicInvitation)
)

router.post(
    "/:token/accept",
    asyncHandler(authenticateUser),
    validate(acceptInvitationParamsSchema, "params"),
    asyncHandler(organizationController.acceptInvitation)
)

export default router