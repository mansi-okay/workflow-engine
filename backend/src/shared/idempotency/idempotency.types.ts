import type { IdempotencyKey, IdempotencyOperation, IdempotencyStatus } from "@prisma/client"

export type IdempotencyCreateInput = {
    key: string
    userId: string
    requestHash: string
    operation: IdempotencyOperation
    status: IdempotencyStatus
    expiresAt: Date
}

export type IdempotencyClaimResult = 
{
    type: "NEW"
    record: IdempotencyKey
} |
{
    type: "EXISTING"
    record: IdempotencyKey
} |
{
    type: "RETRY",
    record: IdempotencyKey
}