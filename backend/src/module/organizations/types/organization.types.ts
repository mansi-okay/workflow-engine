import { Prisma } from "@prisma/client";

export type MembershipWithOrganization = Prisma.MembershipGetPayload<{
    include: {
        organization: true
    }
}>

export type UpdateOrganizationData = {
    name?: string
    slug?: string
    description?: string | null
}