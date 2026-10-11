import { z } from "zod";

export const conditionConfigSchema = z.object({
  fieldPath: z.string().min(1),
  operator: z.enum([
    "EQUALS",
    "NOT_EQUALS",
    "GREATER_THAN",
    "LESS_THAN",
    "CONTAINS",
    "EXISTS",
  ]),
  value: z.unknown().optional(),
})

export const conditionInputSchema = z.object({
  data: z.record(z.string(), z.unknown()),
})

export const conditionOutputSchema = z.object({
  result: z.boolean(),
})