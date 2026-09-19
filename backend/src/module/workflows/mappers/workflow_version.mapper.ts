import type { WorkflowVersion } from "@prisma/client";
import type { WorkflowVersionResponseDto } from "../dtos/workflow_version_response.dto.js";

export const toWorkflowVersionResponse = (data: WorkflowVersion): WorkflowVersionResponseDto => ({
    id: data.id,
    workflowId: data.workflowId,
    versionNumber: data.versionNumber,
    status: data.status,
    createdBy: data.createdBy,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
    publishedBy: data.publishedBy,
    publishedAt: data.publishedAt?.toISOString() ?? null
})