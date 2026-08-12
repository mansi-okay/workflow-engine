-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MEMBER_OWNERSHIP_TRANSFERRED';

-- Ensure an organization can have only one OWNER membership.
CREATE UNIQUE INDEX "one_owner_per_organization"
ON "Membership" ("organizationId")
WHERE "role" = 'OWNER';