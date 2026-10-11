import type { NextFunction, Request, Response } from "express";
import type { AsyncController } from "../../../shared/types/express.types.js";
import type { ExecutionCreationService } from "../services/execution_creation.service.js";
import type { WorkflowParamsInput } from "../../../shared/validations/workflow_params.schema.js";
import { getOrganizationContext } from "../../../shared/utils/http/get_organization_context.js";
import { getAuthContext } from "../../../shared/utils/http/get_auth_context.js";
import { getSessionMetadata } from "../../../shared/utils/http/session_metadata.js";
import { getIdempotencyContext } from "../../../shared/utils/http/get_idempotency_context.js";
import type { RunWorkflowBodyInput } from "../validations/run_workflow.schema.js";
import { TriggerType } from "@prisma/client";
import { toExecutionResponseDto } from "../mappers/execution.mapper.js";
import type { ExecutionListQueryInput } from "../validations/execution_list.schema.js";
import type { ExecutionService } from "../services/execution.service.js";

export class ExecutionController{
    constructor(
        private readonly executionCreationService: ExecutionCreationService,
        private readonly executionService: ExecutionService
    ){}

    runWorkflow: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {input} = req.body as RunWorkflowBodyInput
        const {workflowId} = req.params as WorkflowParamsInput
        const {id: organizationId} = getOrganizationContext(req)
        const {userId} = getAuthContext(req)
        const metadata = getSessionMetadata(req)
        const {recordId} = getIdempotencyContext(req)

        const result = await this.executionCreationService.createExecution(
            organizationId,
            workflowId,
            userId,
            input,
            TriggerType.MANUAL,
            metadata,
            req.logger,
            recordId
        )

        res.status(202).json({
            success: true,
            message: "Workflow execution requested successfully",
            data: {
                execution: toExecutionResponseDto(result)
            }
        })
    }

    listExecutions: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {id: organizationId} = getOrganizationContext(req)
        const pagination = req.query as unknown as ExecutionListQueryInput

        const result = await this.executionService.listExecutions(
            organizationId,
            pagination
        )

        const executionDtos = result.executions.map(execution => toExecutionResponseDto(execution))

        res.status(200).json({
            success: true,
            message: "Fetched executions successfully",
            data: {
                executions: executionDtos,
                pagination: result.pagination
            }
        })
    }
}