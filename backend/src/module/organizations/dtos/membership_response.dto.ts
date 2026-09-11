import { Role } from "@prisma/client"

export type MembershipWithUserResponseDto = {
    id: string
    role: Role
    joinedAt: string
    user: {
        id: string
        name: string
        email: string
    }
}

export type MembershipResponseDto = {
  id: string
  userId: string
  organizationId: string
  role: Role
  joinedAt: string
}