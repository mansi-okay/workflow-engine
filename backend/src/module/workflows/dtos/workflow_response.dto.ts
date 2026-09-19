export type WorkflowResponseDto = {
    id: string
    organizationId: string
    name:string
    description: string | null
    currentPublishedVersionId: string | null
    currentDraftVersionId: string | null
    createdBy: string | null
    createdAt: string
    updatedAt: string
}