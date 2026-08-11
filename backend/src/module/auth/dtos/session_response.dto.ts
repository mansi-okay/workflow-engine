export interface SessionResponseDto {
    id: string
    ipAddress: string | null
    userAgent: string | null
    deviceName: string | null
    createdAt: string
    lastUsedAt: string
    expiresAt: string
    isCurrent: boolean
}