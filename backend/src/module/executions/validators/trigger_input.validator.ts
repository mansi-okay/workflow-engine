import type { TriggerOutput } from "../../../registry/node_type.registry.js";
import { getTriggerSchemas, isTriggerType } from "../../../registry/node_type.utils.js";
import { BadRequestError } from "../../../shared/error/HttpErrors.js";
import type { NodeRepository } from "../../workflows/repository/node.repository.js";

export async function validateTriggerInput(
    input: unknown,
    workflowId: string,
    workflowVersionId: string,
    nodeRepository: NodeRepository
): Promise<TriggerOutput>{
    const triggerNode = await nodeRepository.getTriggerNode(
        workflowVersionId,
        workflowId
    )

    if (!triggerNode){
        throw new BadRequestError("No trigger node found")
    }

    if (!isTriggerType(triggerNode.type)) {
        throw new BadRequestError("Node is not a trigger");
    }

    const schemas = getTriggerSchemas(triggerNode.type)

    if (!schemas){
        throw new BadRequestError("No schemas defined for this node")
    }

    const result = schemas.outputSchema.safeParse(input)

    if (!result.success) {
        throw new BadRequestError(
            result.error.issues.map(issue => issue.message).join(", ")
        )
    }

    return result.data
}