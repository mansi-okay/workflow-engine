import type { Workflow } from "@prisma/client";
import type { WorkflowResponseDto } from "../dtos/workflow_response.dto.js";

export const toWorkflowResponse = (data: Workflow): WorkflowResponseDto => ({
    id: data.id,
    organizationId: data.organizationId,
    name: data.name,
    description: data.description,
    currentPublishedVersionId: data.currentPublishedVersionId,
    currentDraftVersionId: data.currentDraftVersionId,
    createdBy: data.createdBy,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString()
})