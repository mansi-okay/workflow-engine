-- CreateEnum
CREATE TYPE "WorkflowVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IdempotencyOperation" ADD VALUE 'FORGOT_PASSWORD';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'RESET_PASSWORD';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'VERIFY_EMAIL';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'RESEND_VERIFICATION_EMAIL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OutboxEventType" ADD VALUE 'SEND_VERIFICATION_EMAIL';
ALTER TYPE "OutboxEventType" ADD VALUE 'SEND_PASSWORD_RESET_EMAIL';
ALTER TYPE "OutboxEventType" ADD VALUE 'SEND_PASSWORD_RESET_SUCCESS_EMAIL';
ALTER TYPE "OutboxEventType" ADD VALUE 'SEND_EMAIL_VERIFICATION_SUCCESS_EMAIL';

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentPublishedVersionId" TEXT,
    "currentDraftVersionId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "WorkflowVersionStatus" NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedBy" TEXT,

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "position" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edge" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_organizationId_idx" ON "Workflow"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_versionNumber_key" ON "WorkflowVersion"("workflowId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Node_workflowVersionId_nodeKey_key" ON "Node"("workflowVersionId", "nodeKey");

-- CreateIndex
CREATE INDEX "Edge_sourceNodeId_idx" ON "Edge"("sourceNodeId");

-- CreateIndex
CREATE INDEX "Edge_targetNodeId_idx" ON "Edge"("targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Edge_workflowVersionId_sourceNodeId_targetNodeId_key" ON "Edge"("workflowVersionId", "sourceNodeId", "targetNodeId");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_currentDraftVersionId_fkey" FOREIGN KEY ("currentDraftVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Workflow Version Invariants
-- ============================================================

-- A workflow can have at most one active draft version.
CREATE UNIQUE INDEX "one_active_draft_per_workflow"
ON "WorkflowVersion" ("workflowId")
WHERE "status" = 'DRAFT';

-- A workflow can have at most one active published version.
CREATE UNIQUE INDEX "one_active_published_per_workflow"
ON "WorkflowVersion" ("workflowId")
WHERE "status" = 'PUBLISHED';