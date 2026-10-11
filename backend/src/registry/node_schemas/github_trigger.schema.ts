import { z } from "zod";

export const githubTriggerConfigSchema = z.object({
  repository: z.string().min(1),
  event: z.enum(["push"]),
  branch: z.string().optional(),
})

export const githubTriggerInputSchema = z.object({
  event: z.literal("push"),
  repository: z.string().min(1),
  branch: z.string().min(1),
  commitSha: z.string().min(1),
  commitMessage: z.string(),
  sender: z.string().min(1),
})

export const githubTriggerOutputSchema = githubTriggerInputSchema