import { z } from "zod";

export const jiraCreateIssueConfigSchema = z.object({
  projectKey: z.string().min(1),
  issueType: z.string().min(1),
  summaryTemplate: z.string().min(1),
  descriptionTemplate: z.string().optional(),
})

export const jiraCreateIssueInputSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  assignee: z.string().optional(),
  labels: z.array(z.string()).optional(),
})

export const jiraCreateIssueOutputSchema = z.object({
  issueId: z.string(),
  issueKey: z.string(),
  issueUrl: z.url(),
})