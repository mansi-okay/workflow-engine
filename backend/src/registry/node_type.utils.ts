import { NODE_TYPE_REGISTRY, type NodeCategory, type NodeType, type TriggerTypes } from "./node_type.registry.js";

export function getNodeCategory(
    type: string
): NodeCategory | undefined{
    return NODE_TYPE_REGISTRY[type as NodeType]?.category
}

export function getNodeSchemas(type: string){
    if (!Object.hasOwn(NODE_TYPE_REGISTRY, type)) {
        return undefined
    }

    return NODE_TYPE_REGISTRY[type as NodeType]
}

export function getTriggerTypes(): TriggerTypes[] {
    return (Object.keys(NODE_TYPE_REGISTRY) as NodeType[])
        .filter(
            (type) => getNodeCategory(type) === "TRIGGER"
        ) as TriggerTypes[]
}

export function getTriggerSchemas(type: TriggerTypes){
    return NODE_TYPE_REGISTRY[type]
}

export function isTriggerType(type: string): type is TriggerTypes {
    return (
        Object.hasOwn(NODE_TYPE_REGISTRY, type) &&
        getNodeCategory(type) === "TRIGGER"
    )
}