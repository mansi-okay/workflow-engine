import { AuditAction, OutboxEventType, Role, type Execution, type TriggerType } from "@prisma/client";
import type { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import type { SessionMetadata } from "../../../shared/types/session.types.js";
import type { Logger } from "pino";
import { validateTriggerInput } from "../validators/trigger_input.validator.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import type { TriggerOutput } from "../../../registry/node_type.registry.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";
import { toExecutionResponseDto } from "../mappers/execution.mapper.js";

export class ExecutionCreationService{
    constructor(
        private readonly unitOfWork: UnitOfWork,
        private readonly idempotencyService: IdempotencyService
    ){}

    async createExecution(
        organizationId: string,
        workflowId: string,
        userId: string,
        input: unknown,
        triggerType: TriggerType,
        metadata: SessionMetadata,
        logger: Logger,
        idempotencyRecordId: string
    ): Promise<Execution>{
        try {
            const executionData = await this.unitOfWork.transaction(async(repos) => {
    
                const member = await repos.memberships.findByIdAndOrganizationForUpdate(
                    userId,
                    organizationId
                )
    
                if (!member){
                    throw new NotFoundError("Membership does not exist")
                }
    
                if (member.role !== Role.OWNER && member.role !== Role.ADMIN){
                    throw new ForbiddenError("Insufficient permission")
                }
                
                const workflow = await repos.workflows.findByIdAndOrganizationIdForUpdate(
                    organizationId,
                    workflowId
                )
    
                if (!workflow){
                    throw new NotFoundError("Workflow not found")
                }
    
                if (workflow.deletedAt){
                    throw new ConflictError("Workflow has been deleted")
                }
    
                const currentPublishedVersionId = workflow.currentPublishedVersionId
    
                if(!currentPublishedVersionId){
                    throw new ConflictError("Published version does not exist")
                }

                const publishedVersion = await repos.workflowVersions.findPublishedGraphByIdAndWorkflowIdAndOrganizationId(
                    organizationId,
                    workflowId,
                    currentPublishedVersionId
                )

                if(!publishedVersion){
                    throw new ConflictError("Published version does not exist")
                }

                const normalizedInput: TriggerOutput = await validateTriggerInput(
                    input,
                    workflowId,
                    currentPublishedVersionId,
                    repos.nodes
                )
        
                const execution = await repos.executions.create({
                    workflowId,
                    workflowVersionId: currentPublishedVersionId,
                    triggerType,
                    input: normalizedInput
                })
    
                await repos.outbox.create({
                    type: OutboxEventType.WORKFLOW_EXECUTION_REQUESTED,
                    payload: {
                        executionId: execution.id
                    }
                })
    
                await repos.auditLogs.create({
                    action: AuditAction.WORKFLOW_EXECUTION_REQUESTED,
                    userId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    metadata: {
                        workflowId,
                        workflowVersionId: currentPublishedVersionId,
                        executionId: execution.id
                    }
                })

                const resBody = {
                    success: true,
                    message: "Workflow execution requested successfully",
                    data: {
                        execution: toExecutionResponseDto(execution)
                    }
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    202,
                    resBody
                )
    
                return {
                    execution,
                    currentPublishedVersionId
                }
            })

            logger.info({
                workflowId,
                workflowVersionId: executionData.currentPublishedVersionId,
                executionId: executionData.execution.id
            }, "Workflow execution requested")

            return executionData.execution
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }
}
