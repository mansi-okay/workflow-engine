import { Role } from "@prisma/client"

export interface AuthContext{
    userId: string,
    sessionId: string
}

export interface OrganizationContext{
    id: string
    name: string
    slug: string
}

export interface MembershipContext {
    id: string
    userId: string
    organizationId: string
    role: Role
}