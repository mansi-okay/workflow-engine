import type { EdgeInput, NodeInput, WorkflowGraphBodyInput } from "../../module/workflows/validations/workflow_graph.schema.js";
import { BadRequestError } from "../error/HttpErrors.js";

function validateNodeKeys(nodes: NodeInput[]){
    const nodeKeys = nodes.map(node => node.nodeKey)

    const uniqueNodeKeys = new Set(nodeKeys)

    if(nodeKeys.length !== uniqueNodeKeys.size){
        throw new BadRequestError("Duplicate node key")
    }
}

function validateEdgeReferences(
    nodes: NodeInput[],
    edges: EdgeInput[]
){
    const nodeKeys = new Set(nodes.map(node => node.nodeKey))

    for (const edge of edges){
        if (!nodeKeys.has(edge.sourceNodeKey)){
            throw new BadRequestError(`Edge references unknown source: ${edge.sourceNodeKey}`)
        }

        if (!nodeKeys.has(edge.targetNodeKey)){
            throw new BadRequestError(`Edge references unknown target: ${edge.targetNodeKey}`)
        }
    }
}

function validateDuplicateEdges(edges: EdgeInput[]){
    const edgeKeys = new Set<string>()

    for (const edge of edges){
        const key = `${edge.sourceNodeKey}->${edge.targetNodeKey}`

        if (edgeKeys.has(key)){
            throw new BadRequestError(`Duplicate edge: ${edge.sourceNodeKey}->${edge.targetNodeKey}`)
        }

        edgeKeys.add(key)
    }
}

function validateSelfLoops(edges: EdgeInput[]){
    for (const edge of edges){
        if (edge.sourceNodeKey === edge.targetNodeKey){
            throw new BadRequestError(`Self-loop detected on node: ${edge.sourceNodeKey}`)
        }
    }
}

function validateAcyclic(graph: WorkflowGraphBodyInput){
    const adjacencyList = new Map<string, string[]>()

    for (const node of graph.nodes){
        adjacencyList.set(node.nodeKey, [])
    }

    for (const edge of graph.edges){
        adjacencyList.get(edge.sourceNodeKey)?.push(edge.targetNodeKey)
    }

    const visiting = new Set<string>()
    const visited = new Set<string>()

    function dfs(nodeKey: string): boolean {

        if (visiting.has(nodeKey)){
            return true
        }

        if (visited.has(nodeKey)){
            return false
        }

        visiting.add(nodeKey)

        const neighbors = adjacencyList.get(nodeKey) ?? []

        for (const neighbor of neighbors){
            if (dfs(neighbor)){
                return true
            }
        }

        visiting.delete(nodeKey)
        visited.add(nodeKey)

        return false
    }

    for (const node of graph.nodes){
        if (dfs(node.nodeKey)){
            throw new BadRequestError("Workflow graph contains a cycle")
        }
    }
}

export function validateWorkflowGraph(graph: WorkflowGraphBodyInput){
    validateNodeKeys(graph.nodes)
    validateEdgeReferences(graph.nodes, graph.edges)
    validateDuplicateEdges(graph.edges)
    validateSelfLoops(graph.edges)
    validateAcyclic(graph)
}