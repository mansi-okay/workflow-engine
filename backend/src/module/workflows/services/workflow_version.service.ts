import { BadRequestError, ConflictError, NotFoundError } from "../../../shared/error/HttpErrors.js";
import { validateWorkflowGraph } from "../../../shared/graph/graph.validator.js";
import type { WorkflowVersionRepository } from "../repository/workflow_version.repository.js";
import type { UpdateWorkflowGraphOutput, WorkflowVersionWithGraph } from "../types/workflow.types.js";
import type { WorkflowGraphBodyInput } from "../validations/workflow_graph.schema.js";
import type { UnitOfWork } from "../../../shared/database/unit_of_work.js";
import { AuditAction } from "@prisma/client";
import type { SessionMetadata } from "../../../shared/types/session.types.js";
import type { Logger } from "pino";
import type { IdempotencyService } from "../../../shared/idempotency/idempotency.service.js";

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
                const draftVersionId = await repos.workflows.findCurrentDraftVersionId(
                    organizationId,
                    workflowId
                )
    
                if (!draftVersionId){
                    throw new NotFoundError("Draft graph not found")
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
}