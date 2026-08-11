-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_LOGGED_OUT_ALL';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_REFRESHED';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'ORGANIZATION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'INVITATION_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'INVITATION_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'INVITATION_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBER_ROLE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEMBER_REMOVED';

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "VerificationToken_hashedToken_idx";

-- DropIndex
DROP INDEX "VerificationToken_id_idx";

-- CreateIndex
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");

-- add uniqueness only for active users
CREATE UNIQUE INDEX "User_active_email_unique"
ON "User" ("email")
WHERE "deletedAt" IS NULL;