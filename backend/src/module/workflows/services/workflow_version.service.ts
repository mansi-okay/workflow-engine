import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import { validateWorkflowGraph } from "../../../shared/graph/graph.validator.js";
import type { WorkflowVersionRepository } from "../repository/workflow_version.repository.js";
import type { UpdateWorkflowGraphOutput } from "../types/workflow.types.js";
import type { NodeInput, WorkflowGraphBodyInput } from "../validations/workflow_graph.schema.js";
import type { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { AuditAction, Role, WorkflowVersionStatus, type WorkflowVersion } from "@prisma/client";
import type { SessionMetadata } from "../../../shared/types/session.types.js";
import type { Logger } from "pino";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";
import type { PaginationInput } from "../../../shared/validators/pagination.schema.js";
import type { WorkflowVersionListResult, WorkflowVersionWithGraph } from "../types/version.types.js";
import { toWorkflowVersionResponse } from "../mappers/workflow_version.mapper.js";
import { validateWorkflowForPublish } from "../validators/workflow_publish.validator.js";

export class WorkflowVersionService {
    constructor(
        private readonly workflowVersionRepository: WorkflowVersionRepository,
        private readonly unitOfWork: UnitOfWork,
        private readonly idempotencyService: IdempotencyService
    ){}

    async getDraftGraph(
        organizationId: string,
        workflowId: string
    ): Promise<WorkflowVersionWithGraph>{
        const graph =  await this.workflowVersionRepository.findDraftGraphByWorkflowIdAndOrganizationId(
            organizationId,
            workflowId
        )

        if (!graph){
            throw new NotFoundError("Draft graph not found")
        }

        return graph
    }

    async updateWorkflowGraph(
        organizationId: string,
        workflowId: string,
        currentUserId: string,
        graph: WorkflowGraphBodyInput,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<UpdateWorkflowGraphOutput>{
        try {
            validateWorkflowGraph(graph)
    
            const draft = await this.unitOfWork.transaction(async(repos) => {

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
    
                if (workflow.deletedAt){
                    throw new ConflictError("Workflow has been deleted")
                }
    
                const draftVersionId = workflow.currentDraftVersionId
    
                if (!draftVersionId){
                    throw new NotFoundError("Current draft does not exist")
                }
    
                const currentDraft = await repos.workflowVersions.findDraftVersionByIdForUpdate(
                    draftVersionId
                )
    
                if (!currentDraft){
                    throw new NotFoundError("Draft graph not found")
                }
    
                if (graph.revision !== currentDraft.revision){
                    throw new ConflictError("Draft was modified")
                }
    
                await repos.edges.deleteEdges(currentDraft.id)
                await repos.nodes.deleteNodes(currentDraft.id)
    
                const nodeIds = new Map<string, string>()
    
                for (const node of graph.nodes){
                    const newNode = await repos.nodes.create({
                        workflowVersionId: currentDraft.id,
                        nodeKey: node.nodeKey,
                        type: node.type,
                        config: node.config,
                        position: node.position
                    })
    
                    nodeIds.set(node.nodeKey, newNode.id)
                }
    
                for(const edge of graph.edges){
                    const sourceNodeId = nodeIds.get(edge.sourceNodeKey)
                    const targetNodeId = nodeIds.get(edge.targetNodeKey)
    
                    if (!sourceNodeId || !targetNodeId){
                        throw new BadRequestError("Edge references an invalid node")
                    }
    
                    await repos.edges.create({
                        workflowVersionId: currentDraft.id,
                        sourceNodeId,
                        targetNodeId
                    })
                }
    
                const increment = await repos.workflowVersions.incrementDraftRevisionIfCurrent(
                    currentDraft.id,
                    currentDraft.revision
                )
    
                if (!increment){
                    throw new ConflictError("Draft was modified")
                }
    
                await repos.auditLogs.create({
                    action: AuditAction.WORKFLOW_GRAPH_UPDATED,
                    userId: currentUserId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    metadata: {
                        organizationId,
                        workflowId,
                        draftVersionId
                    }
                })

                const resBody = {
                    success: true,
                    message: "Workflow graph updated successfully",
                    data: {
                        draftVersionId: draftVersionId,
                        revision: graph.revision+1
                    }
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    200,
                    resBody
                )
    
                return {
                    draftVersionId,
                    revision: graph.revision + 1
                }
            })
    
            logger.info({
                organizationId,
                workflowId,
                draftVersionId: draft.draftVersionId
            })
    
            return draft
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

    async getVersions(
        organizationId: string,
        workflowId: string,
        pagination: PaginationInput
    ): Promise<WorkflowVersionListResult>{
        return await this.workflowVersionRepository.findVersionsByWorkflowIdAndOrganizationId(
            workflowId,
            organizationId,
            pagination
        )
    }

    async getVersion(
        organizationId: string,
        workflowId: string,
        workflowVersionId: string
    ): Promise<WorkflowVersion>{
        const workflowVersion = await this.workflowVersionRepository.findByIdAndWorkflowIdAndOrganizationId(
            organizationId,
            workflowId,
            workflowVersionId
        )

        if (!workflowVersion){
            throw new NotFoundError("Workflow version not found")
        }

        return workflowVersion
    }

    async getVersionGraph(
        organizationId: string,
        workflowId: string,
        workflowVersionId: string
    ): Promise<WorkflowVersionWithGraph>{
        const graph = await this.workflowVersionRepository.findGraphByIdAndWorkflowIdAndOrganizationId(
            organizationId,
            workflowId,
            workflowVersionId
        )

        if (!graph){
            throw new NotFoundError("Workflow version not found")
        }

        return graph
    }

    async createDraft(
        organizationId: string,
        currentUserId: string,
        workflowId: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ): Promise<WorkflowVersion>{
        try {
            const draftData = await this.unitOfWork.transaction(async (repos) => {
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
    
                if (workflow.deletedAt){
                    throw new ConflictError("Workflow has been deleted")
                }
    
                const currentDraftVersion = workflow.currentDraftVersionId
    
                if (currentDraftVersion){
                    throw new ConflictError("An active draft already exists. Edit the existing draft using PUT /draft/graph.")
                }

                const currentPublishedVersionId = workflow.currentPublishedVersionId

                if(!currentPublishedVersionId){
                    throw new ConflictError("Published version does not exist")
                }

                const publishedGraph = await repos.workflowVersions.findPublishedGraphByIdAndWorkflowIdAndOrganizationId(
                    organizationId,
                    workflowId,
                    currentPublishedVersionId
                )

                if (!publishedGraph){
                    throw new NotFoundError("Published graph not found")
                }

                const latestVersionNumber = await repos.workflowVersions.findLatestVersionNumber(workflowId)
    
                const newDraft = await repos.workflowVersions.create({
                    workflowId,
                    versionNumber: latestVersionNumber+1,
                    status: WorkflowVersionStatus.DRAFT,
                    createdBy: currentUserId
                })

                // Copy published graph to new draft
                const mapOfIds = new Map<string, string>()

                for(const node of publishedGraph.nodes){
                    const newNode = await repos.nodes.create({
                        workflowVersionId: newDraft.id,
                        nodeKey: node.nodeKey,
                        type: node.type,
                        config: node.config as NodeInput["config"],
                        position: node.position as NodeInput["position"]
                    })

                    mapOfIds.set(node.id, newNode.id)
                }

                for (const edge of publishedGraph.edges){
                    const newSourceNodeId = mapOfIds.get(edge.sourceNodeId)
                    const newTargetNodeId = mapOfIds.get(edge.targetNodeId)
    
                    if (!newSourceNodeId || !newTargetNodeId){
                        throw new BadRequestError("Edge references an invalid node")
                    }

                    await repos.edges.create({
                        workflowVersionId: newDraft.id,
                        sourceNodeId: newSourceNodeId,
                        targetNodeId: newTargetNodeId
                    })
                
                }

                await repos.workflows.setCurrentDraft(
                    workflowId,
                    newDraft.id
                )
    
                await repos.auditLogs.create({
                    action: AuditAction.WORKFLOW_DRAFT_CREATED,
                    userId: currentUserId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    metadata:{
                        organizationId,
                        workflowId,
                        newDraftVersionId: newDraft.id,
                        versionNumber: latestVersionNumber+1
                    }
                })

                const resBody = {
                    success: true,
                    message: "Workflow draft created successfully",
                    data: {
                        draftVersion: toWorkflowVersionResponse(newDraft)
                    }
                }

                await repos.idempotency.markCompleted(
                    idempotencyRecordId,
                    201,
                    resBody
                )
    
                return newDraft
            })

            logger.info({
                organizationId,
                workflowId,
                newDraftVersionId: draftData.id,
                versionNumber: draftData.versionNumber
            })

            return draftData
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

    async publishWorkflowVersion(
        organizationId: string,
        currentUserId: string,
        workflowId: string,
        metadata: SessionMetadata,
        idempotencyRecordId: string,
        logger: Logger
    ){
        try {
            const publishData = await this.unitOfWork.transaction(async (repos) => {
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
        
                    if (workflow.deletedAt){
                        throw new ConflictError("Workflow has been deleted")
                    }
    
                    const currentDraftVersionId = workflow.currentDraftVersionId
    
                    if (!currentDraftVersionId){
                        throw new NotFoundError("Current draft version does not exist")
                    }
    
                    const currentDraft = await repos.workflowVersions.findDraftGraphByIdAndWorkflowIdAndOrganizationId(
                        organizationId,
                        workflowId,
                        currentDraftVersionId
                    )
    
                    if (!currentDraft){
                        throw new NotFoundError("Current draft version does not exist")
                    }
    
                    const currentDraftGraph = {
                        revision: currentDraft.revision,
                        nodes: currentDraft.nodes.map(node => ({
                            nodeKey: node.nodeKey,
                            type: node.type,
                            config: node.config,
                            position: node.position
                        })),
                        edges: currentDraft.edges.map(edge => ({
                            sourceNodeKey: edge.sourceNode.nodeKey,
                            targetNodeKey:edge.targetNode.nodeKey
                        }))
                    } as WorkflowGraphBodyInput
    
                    validateWorkflowForPublish(currentDraftGraph)
    
                    if (workflow.currentPublishedVersionId){
                        const archived = await repos.workflowVersions.archiveVersion(
                            workflow.currentPublishedVersionId,
                            organizationId,
                            workflowId
                        )
    
                        if (!archived){
                            throw new ConflictError("Could not archive the current published version")
                        }
                    }
    
                    const published = await repos.workflowVersions.publishVersion(
                        currentDraft.id,
                        organizationId,
                        currentUserId,
                        workflowId
                    )
    
                    if (!published){
                        throw new ConflictError("Could not publish the current draft version")
                    }
    
                    const updatedWorkflow = await repos.workflows.updateVersionPointers(
                        organizationId,
                        workflowId,
                        currentDraft.id
                    )
    
                    await repos.auditLogs.create({
                        action: AuditAction.WORKFLOW_VERSION_PUBLISHED,
                        userId: currentUserId,
                        ipAddress: metadata.ipAddress,
                        userAgent: metadata.userAgent,
                        metadata: {
                            organizationId,
                            workflowId,
                            ...(workflow.currentPublishedVersionId && {
                                archivedVersion: workflow.currentPublishedVersionId
                            }),
                            publishedVersion: updatedWorkflow.currentPublishedVersionId
                        }
                    })

                    const resBody = {
                        success: true,
                        message: "Workflow version published successfully",
                        data: {
                            publishedVersionId: updatedWorkflow.currentPublishedVersionId
                        }
                    }

                    await repos.idempotency.markCompleted(
                        idempotencyRecordId,
                        200,
                        resBody
                    )

                    return {
                        archivedVersionId: workflow.currentPublishedVersionId,
                        publishedVersionId: updatedWorkflow.currentPublishedVersionId
                    }
            })

            logger.info({
                organizationId,
                workflowId,
                ...(publishData.archivedVersionId && {
                    archivedVersionId: publishData.archivedVersionId
                }),
                publishedVersionId: publishData.publishedVersionId,
                publishedBy: currentUserId
            },"Workflow version published")

            return publishData.publishedVersionId
        } catch (error) {
            await this.idempotencyService.markFailed(idempotencyRecordId)
            throw error
        }
    }

}