/*
  Warnings:

  - You are about to drop the column `token` on the `Invitation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[hashedToken]` on the table `Invitation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hashedToken` to the `Invitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MEMBER_LEFT';

-- DropIndex
DROP INDEX "Invitation_token_key";

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "token",
ADD COLUMN     "hashedToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_hashedToken_key" ON "Invitation"("hashedToken");

-- Enforce one active invitation per email per organization.
CREATE UNIQUE INDEX "Invitation_active_organization_email_key"
ON "Invitation" ("organizationId", "email")
WHERE "revokedAt" IS NULL
  AND "acceptedAt" IS NULL;