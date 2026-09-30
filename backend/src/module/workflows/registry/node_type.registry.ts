export const NODE_TYPE_REGISTRY = {
    GITHUB_TRIGGER: {
        category: "TRIGGER",
    },

    SLACK_SEND_MESSAGE: {
        category: "ACTION",
    },

    JIRA_CREATE_ISSUE: {
        category: "ACTION",
    },

    CONDITION: {
        category: "CONDITION",
    },
} as const

export type NodeType = keyof typeof NODE_TYPE_REGISTRY

export type NodeCategory = typeof NODE_TYPE_REGISTRY[NodeType]["category"]

export function getNodeCategory(
    type: string
): NodeCategory | undefined{
    return NODE_TYPE_REGISTRY[type as NodeType]?.category
}