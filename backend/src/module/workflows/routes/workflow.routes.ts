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
import { workflowParamsSchema } from "../validations/workflow_params.schema.js";
import { updateWorkflowMetadataBodySchema } from "../validations/update_workflow.schema.js";
import { workflowGraphSchema } from "../validations/workflow_graph.schema.js";
import { paginationSchema } from "../../../shared/validators/pagination.schema.js";
import { workflowVersionParamsSchema } from "../validations/workflow_version_params.schema.js";

const router = Router()

router.route("/:organizationId/workflows")
.post(
    asyncHandler(authenticateUser),
    validate(organizationParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN,Role.OWNER)),
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
    validate(workflowParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN,Role.OWNER,Role.MEMBER)),
    asyncHandler(workflowController.getWorkflow)
)
.patch(
    asyncHandler(authenticateUser),
    validate(workflowParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.ADMIN, Role.OWNER)),
    validate(updateWorkflowMetadataBodySchema,"body"),
    asyncHandler(workflowController.updateWorkflowMetadata)
)
.delete(
    asyncHandler(authenticateUser),
    validate(workflowParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN)),
    asyncHandler(workflowController.deleteWorkflow)
)

router.route("/:organizationId/workflows/:workflowId/draft/graph")
.get(
    asyncHandler(authenticateUser),
    validate(workflowParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN,Role.MEMBER)),
    asyncHandler(workflowController.getDraftGraph)
)
.put(
    asyncHandler(authenticateUser),
    validate(workflowParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN)),
    validate(workflowGraphSchema, "body"),
    idempotencyMiddleware(idempotencyService, IdempotencyOperation.UPDATE_WORKFLOW_GRAPH),
    asyncHandler(workflowController.updateWorkflowGraph)
)

router.route("/:organizationId/workflows/:workflowId/versions")
.get(
    asyncHandler(authenticateUser),
    validate(workflowParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN,Role.MEMBER)),
    validate(paginationSchema, "query"),
    asyncHandler(workflowController.getVersions)
)

router.route("/:organizationId/workflows/:workflowId/versions/:workflowVersionId")
.get(
    asyncHandler(authenticateUser),
    validate(workflowVersionParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN,Role.MEMBER)),
    asyncHandler(workflowController.getVersion)
)

router.route("/:organizationId/workflows/:workflowId/versions/:workflowVersionId/graph")
.get(
    asyncHandler(authenticateUser),
    validate(workflowVersionParamsSchema,"params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN,Role.MEMBER)),
    asyncHandler(workflowController.getVersionGraph)
)

router.route("/:organizationId/workflows/:workflowId/drafts")
.post(
    asyncHandler(authenticateUser),
    validate(workflowParamsSchema, "params"),
    asyncHandler(organizationContext),
    asyncHandler(authorizeOrganizationRole(Role.OWNER,Role.ADMIN)),
    idempotencyMiddleware(idempotencyService, IdempotencyOperation.CREATE_WORKFLOW_DRAFT),
    asyncHandler(workflowController.createDraft)
)