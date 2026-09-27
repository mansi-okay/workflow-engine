import { WorkflowController } from "../module/workflows/controllers/workflow.controller.js";
import { WorkflowRepository } from "../module/workflows/repository/workflow.repository.js";
import { WorkflowVersionRepository } from "../module/workflows/repository/workflow_version.repository.js";
import { WorkflowService } from "../module/workflows/services/workflow.service.js";
import { WorkflowVersionService } from "../module/workflows/services/workflow_version.service.js";
import { unitOfWork } from "./database.container.js";
import { idempotencyService } from "./idempotency.container.js";

const workflowRepository = new WorkflowRepository()
const workflowVersionRepository = new WorkflowVersionRepository()

const workflowService = new WorkflowService(
    unitOfWork, 
    idempotencyService,
    workflowRepository
)

const workflowVersionService = new WorkflowVersionService(
    workflowVersionRepository,
    unitOfWork,
    idempotencyService
)

export const workflowController = new WorkflowController(
    workflowService,
    workflowVersionService
)