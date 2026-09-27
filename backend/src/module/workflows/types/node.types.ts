import type { NodeInput } from "../validations/workflow_graph.schema.js";

export type CreateNodeInput = {
    workflowVersionId: string
    nodeKey: string
    type: string
    config: NodeInput["config"]
    position: NodeInput["position"]
}