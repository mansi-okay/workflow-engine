import type { NodeInput, WorkflowGraphBodyInput } from "../validations/workflow_graph.schema.js";
import { BadRequestError } from "../../../shared/error/HttpErrors.js";
import { getNodeCategory } from "../registry/node_type.registry.js";
import { validateWorkflowGraph } from "../../../shared/graph/graph.validator.js";

function validateWorkflowHasNodes(nodes: NodeInput[]){
    if (nodes.length === 0){
        throw new BadRequestError("Workflow must contain at least one node")
    }
}

function validateNodeTypes(nodes: NodeInput[]){
    for (const node of nodes){
        if(!getNodeCategory(node.type)){
            throw new BadRequestError(`Invalid node type: ${node.type}`)
        }
    }
}

function validateHasTrigger(nodes: NodeInput[]){
    const hasTrigger = nodes.some(node => getNodeCategory(node.type) === "TRIGGER")

    if (!hasTrigger){
        throw new BadRequestError("Workflow must contain at least one trigger")
    }
}

function validateHasAction(nodes: NodeInput[]){
    const hasAction = nodes.some(node => getNodeCategory(node.type) === "ACTION")

    if (!hasAction){
        throw new BadRequestError("Workflow must contain at least one action")
    }
}

export function validateWorkflowForPublish(graph: WorkflowGraphBodyInput){
    validateWorkflowGraph(graph)
    validateWorkflowHasNodes(graph.nodes)
    validateNodeTypes(graph.nodes)
    validateHasTrigger(graph.nodes)
    validateHasAction(graph.nodes)
}