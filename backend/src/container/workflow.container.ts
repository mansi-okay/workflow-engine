import { WorkflowController } from "../module/workflows/controllers/workflow.controller.js";
import { WorkflowRepository } from "../module/workflows/repository/workflow.repository.js";
import { WorkflowService } from "../module/workflows/services/workflow.service.js";
import { unitOfWork } from "./database.container.js";
import { idempotencyService } from "./idempotency.container.js";

const workflowRepository = new WorkflowRepository()

const workflowService = new WorkflowService(
    unitOfWork, 
    idempotencyService,
    workflowRepository
)

export const workflowController = new WorkflowController(
    workflowService
)