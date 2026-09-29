import type { Logger } from "pino";
import type { CreateWorkflowBodyInput } from "../validations/create_workflow.schema.js";
import type { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { AuditAction, Role, WorkflowVersionStatus } from "@prisma/client";
import type { SessionMetadata } from "../../../shared/types/session.types.js";
import type { CreateWorkflowResult, WorkflowListResult, WorkflowWithVersions } from "../types/workflow.types.js";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";
import { toWorkflowResponse } from "../mappers/workflow.mapper.js";
import { toWorkflowVersionResponse } from "../mappers/workflow_version.mapper.js";
import type { WorkflowRepository } from "../repository/workflow.repository.js";
import type { WorkflowListQueryInput } from "../validations/workflow_list.schema.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import type { UpdateWorkflowMetadataBodyInput } from "../validations/update_workflow.schema.js";

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

                const member = await repos.memberships.findByIdAndOrganizationForUpdate(
                    currentUserId,
                    organizationId
                )
    
                if (!member){
                    throw new NotFoundError("Membership does not exist")
                }
    
                if (member.role !== Role.OWNER && member.role !== Role.ADMIN){
                    throw new ForbiddenError("Insufficient permission")
                }

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

    async updateWorkflowMetadata(
        organizationId: string,
        currentUserId: string,
        workflowId: string,
        data: UpdateWorkflowMetadataBodyInput,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{
        await this.unitOfWork.transaction(async(repos) => {
            const member = await repos.memberships.findByIdAndOrganizationForUpdate(
                currentUserId,
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

            if(workflow.deletedAt){
                throw new ConflictError("Workflow has been deleted")
            }

            const updateData = {
                ...(data.name !== undefined && {
                    name: data.name
                }),
                ...(data.description !== undefined && {
                    description: data.description
                })
            }

            const updatedWorkflow = await repos.workflows.updateMetadata(
                organizationId,
                workflowId,
                updateData
            )

            if (!updatedWorkflow){
                throw new ConflictError("Workflow could not be updated")
            }

            await repos.auditLogs.create({
                action: AuditAction.WORKFLOW_UPDATED,
                userId: currentUserId,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                metadata: {
                    workflowId: workflow.id,
                    organizationId,
                    changes:{
                        ...(data.name !== undefined && {
                            name: {
                                from: workflow.name,
                                to: data.name
                            }
                        }),
                        ...(data.description !== undefined && {
                            description: {
                                from: workflow.description,
                                to: data.description
                            }
                        })
                    }
                }
            })
        })

        logger.info({
            workflowId,
            organizationId,
            currentUserId
        }, "Workflow metadata updated successfully")
    }

    async deleteWorkflow(
        organizationId: string,
        currentUserId: string,
        workflowId: string,
        metadata: SessionMetadata,
        logger: Logger
    ): Promise<void>{
        await this.unitOfWork.transaction(async (repos) => {
            const member = await repos.memberships.findByUserAndOrganizationForUpdate(
                currentUserId,
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

            const deletedWorkflow = await repos.workflows.softDelete(
                organizationId,
                workflowId
            )

            if (!deletedWorkflow){
                throw new ConflictError("Workflow could not be deleted")
            }

            await repos.auditLogs.create({
                action: AuditAction.WORKFLOW_DELETED,
                userId: currentUserId,
                userAgent: metadata.userAgent,
                ipAddress: metadata.ipAddress,
                metadata: {
                    organizationId,
                    workflowId
                }
            })
        })

        logger.info({
            organizationId,
            currentUserId,
            workflowId
        }, "Workflow deleted successfully")
    }
}