import { Router } from "express";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { authenticateUser } from "../../../container/auth.container.js";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { createOrganizationSchema } from "../validations/create_organization.schema.js";
import { organizationContext, organizationController } from "../../../container/organization.container.js";
import { organizationParamsSchema } from "../validations/organization_params.schema.js";
import { authorizeOrganizationRole } from "../middlewares/authorize_organization_role.middleware.js";
import { Role } from "@prisma/client";
import { updateOrganizationSchema } from "../validations/update_organization.schema.js";
import { updateMembershipBodySchema, updateMembershipParamsSchema } from "../validations/update_membership.schema.js";
import { transferOwnershipParamsSchema } from "../validations/transfer_ownership.schema.js";
import { removeMemberParamsSchema } from "../validations/remove_member.schema.js";
import { leaveOrganizationParamsSchema } from "../validations/leave_organization.schema.js";

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

router.get("/:organizationId/members",
    asyncHandler(authenticateUser), 
    validate(organizationParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(organizationController.getMembers)
)

router.route("/:organizationId/members/:memberId")
.patch(
    asyncHandler(authenticateUser),
    validate(updateMembershipParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER, Role.ADMIN)),
    validate(updateMembershipBodySchema,"body"),
    asyncHandler(organizationController.updateMember)
)
.delete(
    asyncHandler(authenticateUser),
    validate(removeMemberParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER, Role.ADMIN)),
    asyncHandler(organizationController.removeMember)
)

router.post("/:organizationId/transfer-ownership/:memberId",
    asyncHandler(authenticateUser),
    validate(transferOwnershipParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER)),
    asyncHandler(organizationController.transferOwnership)
)

router.delete("/:organizationId/leave", 
    asyncHandler(authenticateUser),
    validate(leaveOrganizationParamsSchema, "params"),
    asyncHandler(organizationContext),
    // OWNER cannot leave directly; transfer ownership first.
    asyncHandler(authorizeOrganizationRole(Role.MEMBER, Role.ADMIN)),
    asyncHandler(organizationController.leaveOrganization)
)

export default router