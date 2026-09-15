export interface PaginationMeta {
    nextCursor: string | null
    hasNextPage: boolean
}

export type Cursor = {
    timestamp: Date
    id: string
}