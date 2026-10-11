import z from "zod";
import { cuidV1Schema } from "./cuid.schema.js";

export const organizationParamsSchema = z.object({
    organizationId: cuidV1Schema
})

export type OrganizationParamsInput = z.infer<typeof organizationParamsSchema>