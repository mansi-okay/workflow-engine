import type { Edge } from "@prisma/client";
import type { EdgeResponseDto } from "../dtos/edge_response.dto.js";

export const toEdgeResponse = (
    data: Edge
): EdgeResponseDto => ({
    id: data.id,
    sourceNodeId: data.sourceNodeId,
    targetNodeId: data.targetNodeId
})