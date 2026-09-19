import z from "zod";

export const organizationCursorSchema = z.object({
    timestamp: z.coerce.date(),
    id: z.string().min(1)
})

export type OrganizationCursor = z.infer<typeof organizationCursorSchema>