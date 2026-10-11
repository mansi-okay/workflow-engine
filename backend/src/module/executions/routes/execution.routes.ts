import { Router } from "express";
import { asyncHandler } from "../../../shared/utils/common/asyncHandler.js";
import { authenticateUser } from "../../../container/auth.container.js";
import { validate } from "../../../shared/middleware/validate.middleware.js";
import { workflowParamsSchema } from "../../../shared/validations/workflow_params.schema.js";
import { organizationContext } from "../../../container/organization.container.js";
import { authorizeOrganizationRole } from "../../../shared/middleware/authorize_organization_role.middleware.js";
import { IdempotencyOperation, Role } from "@prisma/client";
import { runWorkflowBodySchema } from "../validations/run_workflow.schema.js";
import { idempotencyMiddleware } from "../../../shared/middleware/idempotency.middleware.js";
import { idempotencyService } from "../../../container/idempotency.container.js";
import { executionController } from "../../../container/execution.container.js";
import { organizationParamsSchema } from "../../../shared/validations/organization_params.schema.js";
import { executionListQuerySchema } from "../validations/execution_list.schema.js";

const router = Router({mergeParams: true})

router.post(
    "/workflows/:workflowId/run",
    asyncHandler(authenticateUser),
    validate(workflowParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN,Role.OWNER)),
    validate(runWorkflowBodySchema, "body"),
    idempotencyMiddleware(idempotencyService, IdempotencyOperation.RUN_WORKFLOW),
    asyncHandler(executionController.runWorkflow)
)

router.get(
    "/executions",
    asyncHandler(authenticateUser),
    validate(organizationParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN,Role.OWNER,Role.MEMBER)),
    validate(executionListQuerySchema, "query"),
    asyncHandler(executionController.listExecutions)
)

export default router