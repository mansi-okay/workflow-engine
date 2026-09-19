-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'WORKFLOW_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'WORKFLOW_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'WORKFLOW_DELETED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IdempotencyOperation" ADD VALUE 'CREATE_WORKFLOW';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'UPDATE_WORKFLOW';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'DELETE_WORKFLOW';

-- Optimize cursor-based pagination for active workflows within an organization,
-- ordered by creation time and ID for deterministic results.
CREATE INDEX "workflow_active_org_created_idx"
ON "Workflow" ("organizationId", "createdAt" DESC, "id" DESC)
WHERE "deletedAt" IS NULL;