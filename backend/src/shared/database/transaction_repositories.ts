import type { SessionRepository } from "../../module/auth/repository/session.repository.js";
import type { VerificationTokenRepository } from "../../module/auth/repository/verification_token.repository.js";
import type { InvitationRepository } from "../../module/organizations/repository/invitation.repository.js";
import type { MembershipRepository } from "../../module/organizations/repository/membership.repository.js";
import type { OrganizationRepository } from "../../module/organizations/repository/organization.repository.js";
import type { UserRepository } from "../../module/users/repository/user.repository.js";
import type { WorkflowRepository } from "../../module/workflows/repository/workflow.repository.js";
import type { WorkflowVersionRepository } from "../../module/workflows/repository/workflow_version.repository.js";
import type { AuditRepository } from "../audit/audit.repository.js";
import type { IdempotencyRepository } from "../idempotency/idempotency.repository.js";
import type { OutboxRepository } from "../outbox/outbox.repository.js";

export interface TransactionRepositories {
    users: UserRepository
    sessions: SessionRepository
    verificationTokens: VerificationTokenRepository
    auditLogs: AuditRepository
    organizations: OrganizationRepository
    memberships: MembershipRepository
    invitations: InvitationRepository
    idempotency: IdempotencyRepository
    outbox: OutboxRepository
    workflows: WorkflowRepository
    workflowVersions: WorkflowVersionRepository
}