import type { Node } from "@prisma/client";
import type { NodeResponseDto } from "../dtos/node_response.dto.js";

export const toNodeResponse = (data: Node): NodeResponseDto => ({
    id: data.id,
    nodeKey: data.nodeKey,
    type: data.type,
    config: data.config,
    position: data.position
})
