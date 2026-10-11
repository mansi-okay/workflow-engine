import { conditionConfigSchema, conditionInputSchema, conditionOutputSchema } from "./node_schemas/condition.schema.js"
import { githubTriggerConfigSchema, githubTriggerInputSchema, githubTriggerOutputSchema } from "./node_schemas/github_trigger.schema.js"
import { jiraCreateIssueConfigSchema, jiraCreateIssueInputSchema, jiraCreateIssueOutputSchema } from "./node_schemas/jira_create_issue.schema.js"
import { slackSendMessageConfigSchema, slackSendMessageInputSchema, slackSendMessageOutputSchema } from "./node_schemas/slack_send_message.schema.js"
import type z from "zod"

export const NODE_TYPE_REGISTRY = {
    GITHUB_TRIGGER: {
        category: "TRIGGER",
        configSchema: githubTriggerConfigSchema,
        inputSchema: githubTriggerInputSchema,
        outputSchema: githubTriggerOutputSchema
    },

    SLACK_SEND_MESSAGE: {
        category: "ACTION",
        configSchema: slackSendMessageConfigSchema,
        inputSchema: slackSendMessageInputSchema,
        outputSchema: slackSendMessageOutputSchema
    },

    JIRA_CREATE_ISSUE: {
        category: "ACTION",
        configSchema: jiraCreateIssueConfigSchema,
        inputSchema: jiraCreateIssueInputSchema,
        outputSchema: jiraCreateIssueOutputSchema
    },

    CONDITION: {
        category: "CONDITION",
        configSchema: conditionConfigSchema,
        inputSchema: conditionInputSchema,
        outputSchema: conditionOutputSchema
    },
} as const

export type NodeType = keyof typeof NODE_TYPE_REGISTRY

export type NodeCategory = typeof NODE_TYPE_REGISTRY[NodeType]["category"]

export type TriggerTypes = {
    [k in NodeType] : 
    typeof NODE_TYPE_REGISTRY[k]["category"] extends "TRIGGER" 
    ? k
    : never 
}[NodeType]

export type TriggerOutput = {
    [k in TriggerTypes]:
    z.infer<typeof NODE_TYPE_REGISTRY[k]["outputSchema"]> 
}[TriggerTypes]