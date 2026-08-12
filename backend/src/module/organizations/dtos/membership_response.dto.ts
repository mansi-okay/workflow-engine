import { Role } from "@prisma/client"

export interface MembershipWithUserResponseDto{
    id: string
    role: Role
    joinedAt: string
    user: {
        id: string
        name: string
        email: string
    }
}

export interface MembershipResponseDto{
  id: string
  userId: string
  organizationId: string
  role: Role
  joinedAt: string
}