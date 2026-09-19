import { Router } from "express";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { authenticateUser } from "../../../container/auth.container.js";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { organizationParamsSchema } from "../../../shared/validators/organization_params.schema.js";
import { organizationContext } from "../../../container/organization.container.js";
import { authorizeOrganizationRole } from "../../../shared/middleware/authorize_organization_role.middleware.js";
import { IdempotencyOperation, Role } from "@prisma/client";
import { createWorkflowBodySchema } from "../validations/create_workflow.schema.js";
import { idempotencyMiddleware } from "../../../shared/middleware/idempotency.middleware.js";
import { idempotencyService } from "../../../container/idempotency.container.js";
import { workflowController } from "../../../container/workflow.container.js";
import { workflowListQuerySchema } from "../validations/workflow_list.schema.js";
import { getWorkflowParamsSchema } from "../validations/get_workflow.schema.js";

const router = Router()

router.route("/:organizationId/workflows")
.post(
    asyncHandler(authenticateUser),
    validate(organizationParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN,Role.OWNER,Role.MEMBER)),
    validate(createWorkflowBodySchema, "body"),
    idempotencyMiddleware(idempotencyService,IdempotencyOperation.CREATE_WORKFLOW),
    asyncHandler(workflowController.createWorkflow)
)
.get(
    asyncHandler(authenticateUser),
    validate(organizationParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN,Role.OWNER,Role.MEMBER)),
    validate(workflowListQuerySchema, "query"),
    asyncHandler(workflowController.getWorkflows)
)

router.route("/:organizationId/workflows/:workflowId")
.get(
    asyncHandler(authenticateUser),
    validate(getWorkflowParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN,Role.OWNER,Role.MEMBER)),
    asyncHandler(workflowController.getWorkflow)
)