import type { IdempotencyKey } from "@prisma/client"

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

export type JsonValue =
string | 
number | 
boolean | 
null |   
JsonValue[] | 
{ [key: string]: JsonValue }