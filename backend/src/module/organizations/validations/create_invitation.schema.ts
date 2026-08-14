import { Role } from "@prisma/client";
import z from "zod";

export const createInvitationBodySchema = z.object({
    email: z.email().trim().lowercase(),
    role: z.enum([Role.ADMIN, Role.MEMBER])
})

export type CreateInvitationBodyInput = z.infer<typeof createInvitationBodySchema>