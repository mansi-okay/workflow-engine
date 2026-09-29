import type { WorkflowVersion } from "@prisma/client";
import type { WorkflowGraphResponseDto, WorkflowVersionResponseDto } from "../dtos/workflow_version_response.dto.js";
import { toNodeResponse } from "./node.mapper.js";
import { toEdgeResponse } from "./edge.mapper.js";
import type { WorkflowVersionWithGraph } from "../types/version.types.js";

export const toWorkflowVersionResponse = (data: WorkflowVersion): WorkflowVersionResponseDto => ({
    id: data.id,
    workflowId: data.workflowId,
    versionNumber: data.versionNumber,
    revision: data.revision,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    publishedBy: data.publishedBy,
    publishedAt: data.publishedAt?.toISOString() ?? null
})

export const toWorkflowGraphResponse = (data: WorkflowVersionWithGraph): WorkflowGraphResponseDto => ({
    workflowVersion: toWorkflowVersionResponse(data),
    nodes: data.nodes.map(toNodeResponse),
    edges: data.edges.map(toEdgeResponse)
})