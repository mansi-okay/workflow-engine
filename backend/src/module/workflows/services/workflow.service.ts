import type { Logger } from "pino";
import type { CreateWorkflowBodyInput } from "../validations/create_workflow.schema.js";
import type { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { AuditAction, WorkflowVersionStatus } from "@prisma/client";
import type { SessionMetadata } from "../../../shared/types/session.types.js";
import type { CreateWorkflowResult, WorkflowListResult, WorkflowWithVersions } from "../types/workflow.types.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";
import { toWorkflowResponse } from "../mappers/workflow.mapper.js";
import { toWorkflowVersionResponse } from "../mappers/workflow_version.mapper.js";
import type { WorkflowRepository } from "../repository/workflow.repository.js";
import type { WorkflowListQueryInput } from "../validations/workflow_list.schema.js";
import { NotFoundError } from "../../../shared/error/HttpErrors.js";

export class WorkflowService{
    constructor(
        private readonly unitOfWork: UnitOfWork,
        private readonly idempotencyService: IdempotencyService,
        private readonly workflowRepository: WorkflowRepository
    ){}

    async createWorkflow(
        data: CreateWorkflowBodyInput,
        organizationId: string,
        currentUserId: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ):Promise<CreateWorkflowResult>{
        try {
            const workflowData = await this.unitOfWork.transaction(async (repos) => {
                const workflow = await repos.workflows.create({
                    organizationId,
                    name: data.name,
                    description: data.description,
                    createdBy: currentUserId
                })
    
                const workflowVersion = await repos.workflowVersions.create({
                    workflowId: workflow.id,
                    versionNumber: 1,
                    status: WorkflowVersionStatus.DRAFT,
                    createdBy: currentUserId,
                })
    
                const workflowWithDraft = await repos.workflows.setCurrentDraft(
                    workflow.id,
                    workflowVersion.id
                )
    
                await repos.auditLogs.create({
                    action: AuditAction.WORKFLOW_CREATED,
                    userId: currentUserId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    metadata:{
                        workflowId: workflow.id,
                        organizationId
                    }
                })

                const resBody = {
                    success: true,
                    message: "Workflow created successfully",
                    data: {
                        workflow: toWorkflowResponse(workflowWithDraft),
                        draftVersion: toWorkflowVersionResponse(workflowVersion)
                    }
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    201,
                    resBody
                )
    
                return {
                    workflow: workflowWithDraft,
                    workflowVersion
                }
            })
    
            logger.info({
                workflowId: workflowData.workflow.id,
                organizationId,
                userId: currentUserId
            }, "Workflow created")
    
            return workflowData
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

    async getWorkflows(
        organizationId: string,
        pagination: WorkflowListQueryInput
    ): Promise<WorkflowListResult>{
        return await this.workflowRepository.findByOrganizationId(
            organizationId,
            pagination
        )
    }

    async getWorkflow(
        organizationId: string,
        workflowId: string
    ): Promise<WorkflowWithVersions>{
        const workflow =  await this.workflowRepository.findByIdAndOrganizationId(
            organizationId,
            workflowId
        )

        if (!workflow){
            throw new NotFoundError("Workflow not found")
        }

        return workflow
    }
}