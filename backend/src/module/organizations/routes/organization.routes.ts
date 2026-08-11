import { Router } from "express";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { authenticateUser } from "../../../container/auth.container.js";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { createOrganizationSchema } from "../validations/create_organization.schema.js";
import { organizationContext, organizationController } from "../../../container/organization.container.js";
import { organizationParamsSchema } from "../validations/organization_params.schema.js";
import { authorizeOrganizationRole } from "../../../shared/middleware/authorize_organization_role.middleware.js";
import { Role } from "@prisma/client";
import { updateOrganizationSchema } from "../validations/update_organization.schema.js";

const router = Router()

router.route("/")
.post(
    asyncHandler(authenticateUser),
    validate(createOrganizationSchema, "body"),
    asyncHandler(organizationController.createOrganization)
)
.get(
    asyncHandler(authenticateUser),
    asyncHandler(organizationController.getOrganizations)
)

router.route("/:organizationId")
.get(
    asyncHandler(authenticateUser),
    validate(organizationParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(organizationController.getOrganizationById)
)
.patch(
    asyncHandler(authenticateUser),
    validate(organizationParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN)),
    validate(updateOrganizationSchema, "body"),
    asyncHandler(organizationController.updateOrganization)
)
.delete(
    asyncHandler(authenticateUser),
    validate(organizationParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER)),
    asyncHandler(organizationController.deleteOrganization)
)

export default router