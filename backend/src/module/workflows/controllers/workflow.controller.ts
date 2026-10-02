import type { NextFunction, Request, Response } from "express";
import type { AsyncController } from "../../../shared/types/express.types.js";
import type { WorkflowService } from "../services/workflow.service.js";
import type { CreateWorkflowBodyInput } from "../validations/create_workflow.schema.js";
import { getOrganizationContext } from "../../../shared/utils/http/get_organization_context.js";
import { getAuthContext } from "../../../shared/utils/http/get_auth_context.js";
import { getSessionMetadata } from "../../../shared/utils/http/session_metadata.js";
import { toWorkflowResponse } from "../mappers/workflow.mapper.js";
import { toWorkflowGraphResponse, toWorkflowVersionResponse } from "../mappers/workflow_version.mapper.js";
import { getIdempotencyContext } from "../../../shared/utils/http/get_idempotency_context.js";
import type { WorkflowListQueryInput } from "../validations/workflow_list.schema.js";
import type { WorkflowParamsInput } from "../validations/workflow_params.schema.js";
import type { UpdateWorkflowMetadataBodyInput } from "../validations/update_workflow.schema.js";
import type { WorkflowVersionService } from "../services/workflow_version.service.js";
import type { WorkflowGraphBodyInput } from "../validations/workflow_graph.schema.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import type { WorkflowVersionParamsInput } from "../validations/workflow_version_params.schema.js";
import type { RollbackWorkflowVersionBodyInput } from "../validations/rollback_version.schema.js";

export class WorkflowController{
    constructor(
        private readonly workflowService: WorkflowService,
        private readonly workflowVersionService: WorkflowVersionService
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
        const {workflowId} = req.params as WorkflowParamsInput
        const { id: organizationId } = getOrganizationContext(req)

        const result = await this.workflowService.getWorkflow(
            organizationId,
            workflowId
        )

        res.status(200).json({
            success: true,
            message: "Workflow fetched successfully",
            data: {
                workflow: toWorkflowResponse(result),
                draftVersion: result.currentDraftVersion 
                ? toWorkflowVersionResponse(result.currentDraftVersion)
                : null,
                publishedVersion: result.currentPublishedVersion
                ? toWorkflowVersionResponse(result.currentPublishedVersion)
                : null
            }
        })
    }

    updateWorkflowMetadata: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as WorkflowParamsInput
        const data = req.body as UpdateWorkflowMetadataBodyInput
        const {userId} = getAuthContext(req)
        const { id: organizationId } = getOrganizationContext(req)
        const metadata = getSessionMetadata(req)

        await this.workflowService.updateWorkflowMetadata(
            organizationId,
            userId,
            workflowId,
            data,
            metadata,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Workflow metadata updated successfully"
        })
    }

    deleteWorkflow: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as WorkflowParamsInput
        const {userId} = getAuthContext(req)
        const { id: organizationId } = getOrganizationContext(req)
        const metadata = getSessionMetadata(req)     
        
        await this.workflowService.deleteWorkflow(
            organizationId,
            userId,
            workflowId,
            metadata,
            req.logger
        )

        res.status(204).send()
    }

    getDraftGraph: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as WorkflowParamsInput
        const { id: organizationId } = getOrganizationContext(req)
        
        const result = await this.workflowVersionService.getDraftGraph(
            organizationId,
            workflowId
        )

        res.status(200).json({
            success: true,
            message: "Draft graph fetched successfully",
            data: toWorkflowGraphResponse(result)
        })
    }

    updateWorkflowGraph: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const { id: organizationId } = getOrganizationContext(req)
        const {workflowId} = req.params as WorkflowParamsInput
        const {userId} = getAuthContext(req)
        const graph = req.body as WorkflowGraphBodyInput
        const metadata = getSessionMetadata(req)     
        const {recordId} = getIdempotencyContext(req)
        

        const draft = await this.workflowVersionService.updateWorkflowGraph(
            organizationId,
            workflowId,
            userId,
            graph,
            metadata,
            recordId,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Workflow graph updated successfully",
            data: {
                draftVersionId: draft.draftVersionId,
                revision: draft.revision
            }
        })
    }

    getVersions: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as WorkflowParamsInput
        const { id: organizationId } = getOrganizationContext(req)
        const pagination = req.query as unknown as PaginationInput

        const result = await this.workflowVersionService.getVersions(
            organizationId,
            workflowId,
            pagination
        )

        const workflowVersionDtos = result.workflowVersions.map(version => toWorkflowVersionResponse(version))

        res.status(200).json({
            success: true,
            message: "Workflow versions fetched successfully",
            data: {
                workflowVersions: workflowVersionDtos,
                pagination: result.pagination
            }
        })
    }

    getVersion: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId, workflowVersionId} = req.params as WorkflowVersionParamsInput
        const { id: organizationId } = getOrganizationContext(req)

        const result = await this.workflowVersionService.getVersion(
            organizationId,
            workflowId,
            workflowVersionId
        )

        res.status(200).json({
            success: true,
            message: "Workflow version fetched successfully",
            data: {
                workflowVersion: toWorkflowVersionResponse(result)
            }
        })

    }

    getVersionGraph: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId, workflowVersionId} = req.params as WorkflowVersionParamsInput
        const { id: organizationId } = getOrganizationContext(req)

        const result = await this.workflowVersionService.getVersionGraph(
            organizationId,
            workflowId,
            workflowVersionId
        )

        res.status(200).json({
            success: true,
            message: "Workflow version graph fetched successfully",
            data: {
                graph: toWorkflowGraphResponse(result)
            }
        })
    }

    createDraft: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as WorkflowParamsInput
        const {userId} = getAuthContext(req)
        const { id: organizationId } = getOrganizationContext(req)
        const metadata = getSessionMetadata(req)    
        const {recordId} = getIdempotencyContext(req)

        const result = await this.workflowVersionService.createDraft(
            organizationId,
            userId,
            workflowId,
            metadata,
            recordId,
            req.logger
        )

        res.status(201).json({
            success: true,
            message: "Workflow draft created successfully",
            data: {
                draftVersion: toWorkflowVersionResponse(result)
            }
        })

    }

    publishWorkflowVersion: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as WorkflowParamsInput
        const {userId} = getAuthContext(req)
        const { id: organizationId } = getOrganizationContext(req)
        const metadata = getSessionMetadata(req)    
        const {recordId} = getIdempotencyContext(req)   
        
        const result = await this.workflowVersionService.publishWorkflowVersion(
            organizationId,
            userId,
            workflowId,
            metadata,
            recordId,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Workflow version published successfully",
            data: {
                publishedVersionId: result
            }            
        })
    }

    rollbackWorkflowVersion: AsyncController = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {workflowId} = req.params as WorkflowParamsInput
        const {workflowVersionId} = req.body as RollbackWorkflowVersionBodyInput
        const {userId} = getAuthContext(req)
        const { id: organizationId } = getOrganizationContext(req)
        const metadata = getSessionMetadata(req)    
        const {recordId} = getIdempotencyContext(req)  

        const result = await this.workflowVersionService.rollbackWorkflowVersion(
            organizationId,
            userId,
            workflowId,
            workflowVersionId,
            metadata,
            recordId,
            req.logger
        )

        res.status(200).json({
            success: true,
            message: "Workflow version rollbacked successfully",
            data: {
                rollbackVersionId: result
            }
        })
    }

}