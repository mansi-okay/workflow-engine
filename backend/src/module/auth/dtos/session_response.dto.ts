export interface SessionResponseDto {
    id: string
    ipAddress?: string
    userAgent?: string
    deviceName?: string
    createdAt: string,
    lastUsedAt: string,
    expiresAt: string
    isCurrent: boolean
}