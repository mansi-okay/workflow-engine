import { ExecutionController } from "../module/executions/controllers/execution.controller.js";
import { ExecutionRepository } from "../module/executions/repository/execution.repository.js";
import { ExecutionService } from "../module/executions/services/execution.service.js";
import { ExecutionCreationService } from "../module/executions/services/execution_creation.service.js";
import { unitOfWork } from "./database.container.js";
import { idempotencyService } from "./idempotency.container.js";

const executionRepository = new ExecutionRepository()

const executionCreationService = new ExecutionCreationService(
    unitOfWork,
    idempotencyService
)

const executionService = new ExecutionService(
    executionRepository
)

export const executionController = new ExecutionController(
    executionCreationService,
    executionService
)