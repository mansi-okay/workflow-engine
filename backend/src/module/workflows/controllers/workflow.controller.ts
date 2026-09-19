import type { NextFunction, Request, Response } from "express";
import type { AsyncController } from "../../../shared/types/express.types.js";
import type { WorkflowService } from "../services/workflow.service.js";
import type { CreateWorkflowBodyInput } from "../validations/create_workflow.schema.js";
import { getOrganizationContext } from "../../../shared/utils/http/get_organization_context.js";
import { getAuthContext } from "../../../shared/utils/http/get_auth_context.js";
import { getSessionMetadata } from "../../../shared/utils/http/session_metadata.js";
import { toWorkflowResponse } from "../mappers/workflow.mapper.js";
import { toWorkflowVersionResponse } from "../mappers/workflow_version.mapper.js";
import { getIdempotencyContext } from "../../../shared/utils/http/get_idempotency_context.js";
import type { WorkflowListQueryInput } from "../validations/workflow_list.schema.js";
import type { GetWorkflowParamsInput } from "../validations/get_workflow.schema.js";

export class WorkflowController{
    constructor(
        private readonly workflowService: WorkflowService
    ){}

    createWorkflow: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const data = req.body as CreateWorkflowBodyInput
        const {userId} = getAuthContext(req)
        const {id: organizationId} = getOrganizationContext(req)
        const metadata = getSessionMetadata(req)
        const {recordId} = getIdempotencyContext(req)

        const result = await this.workflowService.createWorkflow(
            data,
            organizationId,
            userId,
            metadata,
            recordId,
            req.logger
        )

        res.status(201).json({
            success: true,
            message: "Workflow created successfully",
            data: {
                workflow: toWorkflowResponse(result.workflow),
                draftVersion: toWorkflowVersionResponse(result.workflowVersion)
            }
        })
    }

    getWorkflows: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const pagination = req.query as unknown as WorkflowListQueryInput
        const {id: organizationId} = getOrganizationContext(req)

        const result = await this.workflowService.getWorkflows(
            organizationId,
            pagination
        )

        const workflowDtos = result.workflows.map(workflow => toWorkflowResponse(workflow))

        res.status(200).json({
            success: true,
            message: "Fetched workflows successfully",
            data: {
                workflows: workflowDtos,
                pagination: result.pagination
            }
        })
    }

    getWorkflow: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as GetWorkflowParamsInput
        const { id: organizationId } = getOrganizationContext(req)

        const result = await this.workflowService.getWorkflowById(
            organizationId,
            workflowId
        )

        res.status(200).json({
            success: true,
            message: "Workflow fetched successfully",
            data: {
                workflow: toWorkflowResponse(result),
                ... (result.currentDraftVersion && {
                    draftVersion: toWorkflowVersionResponse(result.currentDraftVersion)
                }),
                ...(result.currentPublishedVersion && {
                    publishedVersion: toWorkflowVersionResponse(result.currentPublishedVersion)
                })
            }
        })
    }
}