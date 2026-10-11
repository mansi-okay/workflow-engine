import { z } from "zod";

export const slackSendMessageConfigSchema = z.object({
  channelId: z.string().min(1),
  messageTemplate: z.string().min(1),
})

export const slackSendMessageInputSchema = z.object({
  message: z.string().min(1),
  channelId: z.string().min(1).optional(),
})

export const slackSendMessageOutputSchema = z.object({
  channelId: z.string(),
  messageId: z.string(),
  timestamp: z.string(),
})