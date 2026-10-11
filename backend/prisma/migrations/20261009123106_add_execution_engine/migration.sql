/*
  Warnings:

  - A unique constraint covering the columns `[id,workflowVersionId]` on the table `Node` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'CANCEL_REQUESTED', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NodeExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'WEBHOOK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'WORKFLOW_GRAPH_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'WORKFLOW_DRAFT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'WORKFLOW_VERSION_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'WORKFLOW_VERSION_ROLLED_BACK';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IdempotencyOperation" ADD VALUE 'UPDATE_WORKFLOW_GRAPH';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'CREATE_WORKFLOW_DRAFT';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'PUBLISH_WORKFLOW_VERSION';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'ROLLBACK_WORKFLOW_VERSION';
ALTER TYPE "IdempotencyOperation" ADD VALUE 'RUN_WORKFLOW';

-- AlterEnum
ALTER TYPE "OutboxEventType" ADD VALUE 'WORKFLOW_EXECUTION_REQUESTED';

-- AlterTable
ALTER TABLE "WorkflowVersion" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerType" "TriggerType" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "input" JSONB,
    "error" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeExecution" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "status" "NodeExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "input" JSONB,
    "output" JSONB,
    "error" JSONB,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Execution_workflowVersionId_idx" ON "Execution"("workflowVersionId");

-- CreateIndex
CREATE INDEX "Execution_status_idx" ON "Execution"("status");

-- CreateIndex
CREATE INDEX "Execution_createdAt_idx" ON "Execution"("createdAt");

-- CreateIndex
CREATE INDEX "Execution_workflowId_createdAt_idx" ON "Execution"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "Execution_status_createdAt_idx" ON "Execution"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Execution_id_workflowVersionId_key" ON "Execution"("id", "workflowVersionId");

-- CreateIndex
CREATE INDEX "NodeExecution_executionId_idx" ON "NodeExecution"("executionId");

-- CreateIndex
CREATE INDEX "NodeExecution_nodeId_idx" ON "NodeExecution"("nodeId");

-- CreateIndex
CREATE INDEX "NodeExecution_status_idx" ON "NodeExecution"("status");

-- CreateIndex
CREATE INDEX "NodeExecution_createdAt_idx" ON "NodeExecution"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NodeExecution_executionId_nodeId_attempt_key" ON "NodeExecution"("executionId", "nodeId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "Node_id_workflowVersionId_key" ON "Node"("id", "workflowVersionId");

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeExecution" ADD CONSTRAINT "NodeExecution_executionId_workflowVersionId_fkey" FOREIGN KEY ("executionId", "workflowVersionId") REFERENCES "Execution"("id", "workflowVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeExecution" ADD CONSTRAINT "NodeExecution_nodeId_workflowVersionId_fkey" FOREIGN KEY ("nodeId", "workflowVersionId") REFERENCES "Node"("id", "workflowVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeExecution" ADD CONSTRAINT "NodeExecution_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
