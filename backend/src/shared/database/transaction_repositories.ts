import { SessionRepository } from "../../module/auth/repository/session.repository.js";
import { VerificationTokenRepository } from "../../module/auth/repository/verification_token.repository.js";
import { MembershipRepository } from "../../module/organizations/repository/membership.repository.js";
import { OrganizationRepository } from "../../module/organizations/repository/organization.repository.js";
import { UserRepository } from "../../module/users/repository/user.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";

export interface TransactionRepositories {
    users: UserRepository
    sessions: SessionRepository
    verificationTokens: VerificationTokenRepository
    auditLogs: AuditRepository
    organizations: OrganizationRepository
    memberships: MembershipRepository
}